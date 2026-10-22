package com.newcafe.backend.dto.menu;

import java.util.List;

import com.newcafe.backend.entity.Menu;

// 메뉴 목록·상세 응답
public record MenuResponse(
        Long id,
        String nameKor,
        String nameEng,
        String description,
        String image,
        String label,
        List<MenuSizeResponse> sizes) {

    public static MenuResponse from(Menu menu) {
        return new MenuResponse(
                menu.getId(),
                menu.getNameKor(),
                menu.getNameEng(),
                menu.getDescription(),
                menu.getImage(),
                menu.getLabel(),
                menu.getSizes().stream().map(MenuSizeResponse::from).toList());
    }
}
