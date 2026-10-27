package com.newcafe.backend.service.admin;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.menu.admin.BranchMenuResponse;
import com.newcafe.backend.dto.menu.admin.BranchMenuStatusRequest;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuAvailability;
import com.newcafe.backend.entity.MenuAvailability.SaleStatus;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.MenuAvailabilityRepository;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 지점별 메뉴 판매 상태 (menus_available). 상태 행이 없는 메뉴는 판매 중(ON_SALE)으로 본다. 없는 지점이면 404.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchMenuService {

    private final MenuRepository menuRepository;
    private final MenuAvailabilityRepository menuAvailabilityRepository;
    private final BranchRepository branchRepository;

    // 지점의 메뉴별 판매 상태 목록 (삭제되지 않은 모든 메뉴)
    public List<BranchMenuResponse> findAll(String branchId) {
        getBranch(branchId);
        Map<Long, SaleStatus> statusByMenuId = menuAvailabilityRepository.findAllByBranchId(branchId).stream()
                .collect(Collectors.toMap(a -> a.getMenu().getId(), MenuAvailability::getStatus));

        return menuRepository.findAllByDeletedFalseOrderByIdAsc().stream()
                .map(menu -> BranchMenuResponse.from(branchId, menu,
                        statusByMenuId.getOrDefault(menu.getId(), SaleStatus.ON_SALE)))
                .toList();
    }

    // 지점의 메뉴 판매 상태 변경 (행이 없으면 만든다)
    @Transactional
    public BranchMenuResponse updateStatus(String branchId, Long menuId, BranchMenuStatusRequest request) {
        Branch branch = getBranch(branchId);
        if (request == null || request.status() == null) {
            throw new BadRequestException("MENU_STATUS_REQUIRED", "판매 상태(ON_SALE, SOLD_OUT, HIDDEN)를 입력해야 합니다.");
        }
        Menu menu = menuRepository.findByIdAndDeletedFalse(menuId)
                .orElseThrow(() -> new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + menuId));

        MenuAvailability availability = menuAvailabilityRepository.findByBranchIdAndMenuId(branchId, menuId)
                .orElseGet(() -> {
                    MenuAvailability created = new MenuAvailability();
                    created.setBranch(branch);
                    created.setMenu(menu);
                    return created;
                });
        availability.setStatus(request.status());
        menuAvailabilityRepository.save(availability);

        return BranchMenuResponse.from(branchId, menu, availability.getStatus());
    }

    private Branch getBranch(String branchId) {
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다. id=" + branchId));
    }
}
