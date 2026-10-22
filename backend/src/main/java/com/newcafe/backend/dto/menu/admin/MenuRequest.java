package com.newcafe.backend.dto.menu.admin;

import java.util.List;

// 관리자 메뉴 등록·수정 요청
public record MenuRequest(
        String nameKor,
        String nameEng,
        String description,
        String image,
        String label,
        List<MenuSizeRequest> sizes) {
}
