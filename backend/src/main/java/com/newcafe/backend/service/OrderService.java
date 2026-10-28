package com.newcafe.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.ForbiddenException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.order.OrderItemRequest;
import com.newcafe.backend.dto.order.OrderRequest;
import com.newcafe.backend.dto.order.OrderResponse;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.entity.Grade;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuAvailability;
import com.newcafe.backend.entity.MenuAvailability.SaleStatus;
import com.newcafe.backend.entity.MenuSize;
import com.newcafe.backend.entity.Order;
import com.newcafe.backend.entity.OrderItem;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.MenuAvailabilityRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.OrderRepository;

import lombok.RequiredArgsConstructor;

// 주문 · 내 주문 목록 · 상세 (결제는 PaymentService)
// 주문은 지점 단위다 — 영업 중인 지점에서, 그 지점에서 판매 중이고 내 등급으로 해금된 메뉴만 주문할 수 있다.
// 단가 · 합계는 요청 값을 믿지 않고 메뉴 사이즈 가격으로 다시 계산한다. 주문하면 결제 대기(READY)로 만들어진다
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    // 한 줄에 담을 수 있는 최대 수량 (프론트 CART_MAX_QUANTITY)
    private static final int MAX_QUANTITY = 20;

    private final OrderRepository orderRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final MenuRepository menuRepository;
    private final MenuAvailabilityRepository menuAvailabilityRepository;

    // 내 주문 목록, 최신순
    public List<OrderResponse> findMine(Long memberNo) {
        return orderRepository.findAllByMemberNoOrderByCreatedDateDescIdDesc(memberNo).stream()
                .map(OrderResponse::from)
                .toList();
    }

    // 내 주문 상세 (남의 주문이면 403)
    public OrderResponse findById(Long memberNo, Long orderId) {
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new NotFoundException("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다. id=" + orderId));
        if (!order.getMember().getNo().equals(memberNo)) {
            throw new ForbiddenException("ORDER_FORBIDDEN", "본인 주문만 볼 수 있습니다.");
        }
        return OrderResponse.from(order);
    }

    // 주문 — 지점 · 메뉴 · 사이즈 · 수량을 확인하고 결제 대기 상태로 저장한다
    @Transactional
    public OrderResponse create(Long memberNo, OrderRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new BadRequestException("ORDER_EMPTY", "빈 장바구니는 주문할 수 없습니다.");
        }
        Branch branch = findOpenBranch(request.branchId());
        Member member = memberRepository.findByNoAndDeletedFalse(memberNo)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + memberNo));

        Order order = new Order();
        order.setMember(member);
        order.setBranch(branch);
        for (OrderItemRequest item : request.items()) {
            if (item == null || item.menuId() == null) {
                throw new BadRequestException("INVALID_ORDER_ITEM", "주문할 메뉴를 골라 주세요.");
            }
            if (item.quantity() == null || item.quantity() < 1 || item.quantity() > MAX_QUANTITY) {
                throw new BadRequestException("INVALID_QUANTITY", "수량은 1~" + MAX_QUANTITY + "개여야 합니다.");
            }
            Menu menu = menuRepository.findByIdAndDeletedFalse(item.menuId())
                    .orElseThrow(() -> menuNotFound(item.menuId()));
            checkOrderable(menu, branch.getId(), member.getGrade());
            MenuSize size = menu.sizeOf(item.size()).orElseThrow(() -> invalidSize(menu, item.size()));
            order.addItem(menu, size.getSize().trim(), item.quantity(), size.getPrice());
        }
        order.preparePayment();
        return OrderResponse.from(orderRepository.save(order));
    }

    // 있고 영업 중인 지점
    private Branch findOpenBranch(String branchId) {
        if (branchId == null || branchId.isBlank()) {
            throw new BadRequestException("BRANCH_REQUIRED", "주문할 지점을 골라 주세요.");
        }
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다. id=" + branchId));
        if (!branch.isOpen()) {
            throw new ConflictException("BRANCH_CLOSED", "지금은 영업하지 않는 지점이에요.");
        }
        return branch;
    }

    // 결제 직전에 주문한 메뉴를 다시 확인한다(PaymentService) — 주문한 뒤 결제하기 전에 삭제 · 숨김 · 품절되거나
    // 해금 등급이 올라간 메뉴가 있으면 토스 승인 전에 막는다
    public void checkOrderable(Order order) {
        Grade grade = order.getMember().getGrade();
        for (OrderItem item : order.getItems()) {
            Menu menu = item.getMenu();
            if (menu.isDeleted()) {
                throw menuNotFound(menu.getId());
            }
            checkOrderable(menu, order.getBranch().getId(), grade);
        }
    }

    // 이 지점에서 이 등급의 회원이 주문할 수 있는 메뉴인가 — 숨김이면 404, 품절이면 409, 잠김이면 403 (판매 상태 행이 없으면 판매 중)
    private void checkOrderable(Menu menu, String branchId, Grade memberGrade) {
        SaleStatus status = menuAvailabilityRepository.findByBranchIdAndMenuId(branchId, menu.getId())
                .map(MenuAvailability::getStatus)
                .orElse(SaleStatus.ON_SALE);
        if (status == SaleStatus.HIDDEN) {
            throw menuNotFound(menu.getId());
        }
        if (status == SaleStatus.SOLD_OUT) {
            throw new ConflictException("MENU_SOLD_OUT", "품절된 메뉴예요. " + menu.getNameKor());
        }
        if (menu.isLockedFor(memberGrade)) {
            throw new ForbiddenException("MENU_LOCKED",
                    menu.getRequiredGrade().getName() + " 등급부터 주문할 수 있는 메뉴예요. " + menu.getNameKor());
        }
    }

    private static NotFoundException menuNotFound(Long menuId) {
        return new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + menuId);
    }

    private static BadRequestException invalidSize(Menu menu, String size) {
        return new BadRequestException("INVALID_SIZE", menu.getNameKor() + "에 없는 사이즈입니다. size=" + size);
    }
}
