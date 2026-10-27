package com.newcafe.backend.dto.menu;

import java.util.List;

import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuAvailability.SaleStatus;

// 메뉴 목록·상세 응답. status는 지점(branchId)을 지정해 조회했을 때만 채워진다(지정하지 않으면 null).
public record MenuResponse(
        Long id,
        Integer categoryId,
        String nameKor,
        String nameEng,
        String description,
        String image,
        String label,
        SaleStatus status,
        List<MenuSizeResponse> sizes) {

    public static MenuResponse from(Menu menu, SaleStatus status) {
        return new MenuResponse(
                menu.getId(),
                menu.getCategory().getId(),
                menu.getNameKor(),
                menu.getNameEng(),
                menu.getDescription(),
                menu.getImage(),
                menu.getLabel(),
                status,
                menu.getSizes().stream().map(MenuSizeResponse::from).toList());
    }
}
