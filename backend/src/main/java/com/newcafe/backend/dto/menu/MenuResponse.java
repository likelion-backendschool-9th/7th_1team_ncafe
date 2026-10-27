package com.newcafe.backend.dto.menu;

import java.util.List;

import com.newcafe.backend.dto.grade.GradeResponse;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.MenuAvailability.SaleStatus;

// 메뉴 목록·상세 응답. status는 지점(branchId)을 지정해 조회했을 때만 채워진다(지정하지 않으면 null).
// requiredGrade는 해금 등급(없으면 null) — 로그인하지 않아도 "준마부터"처럼 보여 줄 수 있게 이름과 필요 쿠폰까지 내려준다.
public record MenuResponse(
        Long id,
        Integer categoryId,
        String nameKor,
        String nameEng,
        String description,
        String image,
        String label,
        GradeResponse requiredGrade,
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
                menu.getRequiredGrade() == null ? null : GradeResponse.from(menu.getRequiredGrade()),
                status,
                menu.getSizes().stream().map(MenuSizeResponse::from).toList());
    }
}
