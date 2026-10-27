package com.newcafe.backend.dto.menu.admin;

import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuAvailability.SaleStatus;

// 관리자 지점별 메뉴 판매 상태 응답
public record BranchMenuResponse(
        String branchId,
        Long menuId,
        Integer categoryId,
        String nameKor,
        String nameEng,
        SaleStatus status) {

    public static BranchMenuResponse from(String branchId, Menu menu, SaleStatus status) {
        return new BranchMenuResponse(
                branchId,
                menu.getId(),
                menu.getCategory().getId(),
                menu.getNameKor(),
                menu.getNameEng(),
                status);
    }
}
