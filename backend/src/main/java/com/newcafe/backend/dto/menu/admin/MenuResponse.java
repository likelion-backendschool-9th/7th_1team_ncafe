package com.newcafe.backend.dto.menu.admin;

import java.util.List;

import com.newcafe.backend.dto.grade.GradeResponse;
import com.newcafe.backend.entity.Menu;

// 관리자 메뉴 목록·상세 응답
public record MenuResponse(
        Long id,
        Integer categoryId,
        String nameKor,
        String nameEng,
        String description,
        String image,
        String label,
        GradeResponse requiredGrade, // 해금 등급 (없으면 null)
        List<MenuSizeResponse> sizes) {

    public static MenuResponse from(Menu menu) {
        return new MenuResponse(
                menu.getId(),
                menu.getCategory().getId(),
                menu.getNameKor(),
                menu.getNameEng(),
                menu.getDescription(),
                menu.getImage(),
                menu.getLabel(),
                menu.getRequiredGrade() == null ? null : GradeResponse.from(menu.getRequiredGrade()),
                menu.getSizes().stream().map(MenuSizeResponse::from).toList());
    }
}
