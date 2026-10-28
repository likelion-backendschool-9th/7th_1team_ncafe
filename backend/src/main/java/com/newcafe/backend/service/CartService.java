package com.newcafe.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ForbiddenException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.cart.CartRequest;
import com.newcafe.backend.dto.cart.CartResponse;
import com.newcafe.backend.entity.Cart;
import com.newcafe.backend.entity.Grade;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuSize;
import com.newcafe.backend.repository.CartRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

// 장바구니 (로그인 회원). 비로그인 때 브라우저에 담은 줄은 로그인하면 merge로 합친다.
// 내 등급으로 잠긴 메뉴(해금 등급)는 담을 수 없다. 지점은 담지 않는다 — 품절 · 숨김은 지점별이라 지점을 고르는 주문(OrderService)과
// 결제 직전(PaymentService)에 확인한다. 결제를 마치면 주문한 줄이 빠진다(PaymentService)
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartService {

    // 한 줄에 담을 수 있는 최대 수량 (프론트 CART_MAX_QUANTITY)
    private static final int MAX_QUANTITY = 20;

    private final CartRepository cartRepository;
    private final MenuRepository menuRepository;
    private final MemberRepository memberRepository;

    // 내 장바구니, 담은 순서
    public List<CartResponse> findMine(Long memberNo) {
        return cartRepository.findAllByMemberNo(memberNo).stream().map(CartResponse::from).toList();
    }

    // 담기 — 이미 담은 메뉴 · 사이즈면 수량만 더한다(최대 20개, 넘치면 20개로 맞춘다). 잠긴 메뉴면 403
    @Transactional
    public CartResponse add(Long memberNo, CartRequest request) {
        checkQuantity(request);
        MenuSize size = findSize(request);
        checkUnlocked(size.getMenu(), findMember(memberNo).getGrade());
        return CartResponse.from(addQuantity(memberNo, size, request.quantity()));
    }

    // 수량 변경 (담지 않은 줄이면 404, 담은 뒤 잠긴 메뉴면 403)
    @Transactional
    public CartResponse update(Long memberNo, CartRequest request) {
        checkQuantity(request);
        MenuSize size = findSize(request);
        checkUnlocked(size.getMenu(), findMember(memberNo).getGrade());
        Cart cart = cartRepository.findByMemberNoAndMenuSizeId(memberNo, size.getId())
                .orElseThrow(() -> new NotFoundException("CART_ITEM_NOT_FOUND", "장바구니에 없는 메뉴입니다. menuId=" + request.menuId()));
        cart.setQuantity(request.quantity());
        return CartResponse.from(cart);
    }

    // 한 줄 삭제 (없던 줄이어도 오류가 아니다)
    @Transactional
    public void remove(Long memberNo, Long menuId, String size) {
        menuRepository.findById(menuId)
                .flatMap(menu -> menu.sizeOf(size))
                .ifPresent(menuSize -> cartRepository.deleteByMemberNoAndMenuSizeId(memberNo, menuSize.getId()));
    }

    // 전체 비우기
    @Transactional
    public void clear(Long memberNo) {
        cartRepository.deleteByMemberNo(memberNo);
    }

    // 로그인 시 합치기 — 비로그인 때 담아 둔 줄들을 담기와 같은 규칙으로 더하고 내 장바구니 전체를 돌려준다.
    // 그사이 삭제된 메뉴 · 없어진 사이즈 · 잘못된 수량 · 내 등급으로 잠긴 메뉴의 줄은 건너뛴다(로그인 흐름이 막히지 않게)
    @Transactional
    public List<CartResponse> merge(Long memberNo, List<CartRequest> requests) {
        Grade grade = findMember(memberNo).getGrade();
        if (requests != null) {
            for (CartRequest request : requests) {
                if (request == null || request.menuId() == null || request.quantity() == null || request.quantity() < 1) {
                    continue;
                }
                menuRepository.findByIdAndDeletedFalse(request.menuId())
                        .filter(menu -> !menu.isLockedFor(grade))
                        .flatMap(menu -> menu.sizeOf(request.size()))
                        .ifPresent(size -> addQuantity(memberNo, size, request.quantity()));
            }
        }
        return findMine(memberNo);
    }

    private Cart addQuantity(Long memberNo, MenuSize size, int quantity) {
        Cart cart = cartRepository.findByMemberNoAndMenuSizeId(memberNo, size.getId()).orElse(null);
        if (cart == null) {
            cart = new Cart();
            cart.setMember(memberRepository.getReferenceById(memberNo));
            cart.setMenuSize(size);
            cart.setQuantity(Math.min(MAX_QUANTITY, quantity));
            return cartRepository.save(cart);
        }
        cart.setQuantity(Math.min(MAX_QUANTITY, cart.getQuantity() + quantity));
        return cart;
    }

    // 요청의 메뉴 · 사이즈 (삭제된 메뉴면 404, 없는 사이즈면 400)
    private MenuSize findSize(CartRequest request) {
        if (request.menuId() == null) {
            throw new BadRequestException("INVALID_CART_ITEM", "담을 메뉴를 골라 주세요.");
        }
        Menu menu = menuRepository.findByIdAndDeletedFalse(request.menuId())
                .orElseThrow(() -> new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + request.menuId()));
        return menu.sizeOf(request.size())
                .orElseThrow(() -> new BadRequestException("INVALID_SIZE",
                        menu.getNameKor() + "에 없는 사이즈입니다. size=" + request.size()));
    }

    // 내 등급으로 해금된 메뉴인지 (프론트 lockOf와 같은 규칙, Menu.isLockedFor)
    private static void checkUnlocked(Menu menu, Grade memberGrade) {
        if (menu.isLockedFor(memberGrade)) {
            throw new ForbiddenException("MENU_LOCKED",
                    menu.getRequiredGrade().getName() + " 등급부터 담을 수 있는 메뉴예요. " + menu.getNameKor());
        }
    }

    private Member findMember(Long memberNo) {
        return memberRepository.findByNoAndDeletedFalse(memberNo)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + memberNo));
    }

    private static void checkQuantity(CartRequest request) {
        if (request == null || request.quantity() == null || request.quantity() < 1 || request.quantity() > MAX_QUANTITY) {
            throw new BadRequestException("INVALID_QUANTITY", "수량은 1~" + MAX_QUANTITY + "개여야 합니다.");
        }
    }
}
