package com.newcafe.backend.dto.menu.admin;

import java.util.List;

// 관리자 메뉴 등록·수정 요청
public record MenuRequest(
        Integer categoryId,
        String nameKor,
        String nameEng,
        String description,
        String image,
        String label,
        Integer requiredGradeId, // 해금 등급 (없으면 누구나)
        List<MenuSizeRequest> sizes) {
}
