package com.newcafe.backend.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.BranchIds;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.menu.MenuResponse;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuAvailability;
import com.newcafe.backend.entity.MenuAvailability.SaleStatus;
import com.newcafe.backend.repository.MenuAvailabilityRepository;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

// 사용자용 메뉴 조회 (등록·수정·삭제는 service.admin.MenuService)
// 판매 상태는 지점별(menus_available)이다. branchId를 주면 그 지점의 상태를 채우고 숨김(HIDDEN) 메뉴는 뺀다.
// 상태 행이 없는 메뉴는 판매 중(ON_SALE)으로 본다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private final MenuRepository menuRepository;
    private final MenuAvailabilityRepository menuAvailabilityRepository;

    // 메뉴 목록 조회 (categoryId: 카테고리 필터, branchId: 지점별 판매 상태. 둘 다 생략 가능)
    public List<MenuResponse> findAll(Integer categoryId, String branchId) {
        List<Menu> menus = categoryId == null
                ? menuRepository.findAllByDeletedFalseOrderByIdAsc()
                : menuRepository.findAllByCategoryIdAndDeletedFalseOrderByIdAsc(categoryId);

        if (branchId == null) {
            return menus.stream().map(menu -> MenuResponse.from(menu, null)).toList();
        }

        Map<Long, SaleStatus> statusByMenuId = menuAvailabilityRepository.findAllByBranchId(BranchIds.require(branchId)).stream()
                .collect(Collectors.toMap(a -> a.getMenu().getId(), MenuAvailability::getStatus));
        return menus.stream()
                .map(menu -> MenuResponse.from(menu, statusByMenuId.getOrDefault(menu.getId(), SaleStatus.ON_SALE)))
                .filter(menu -> menu.status() != SaleStatus.HIDDEN)
                .toList();
    }

    // 메뉴 상세 조회 (branchId를 주면 그 지점에서 숨긴 메뉴는 404)
    public MenuResponse findById(Long id, String branchId) {
        Menu menu = menuRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> notFound(id));
        if (branchId == null) {
            return MenuResponse.from(menu, null);
        }

        SaleStatus status = menuAvailabilityRepository.findByBranchIdAndMenuId(BranchIds.require(branchId), id)
                .map(MenuAvailability::getStatus)
                .orElse(SaleStatus.ON_SALE);
        if (status == SaleStatus.HIDDEN) {
            throw notFound(id);
        }
        return MenuResponse.from(menu, status);
    }

    private NotFoundException notFound(Long id) {
        return new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + id);
    }
}
