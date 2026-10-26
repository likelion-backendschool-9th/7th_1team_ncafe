package com.newcafe.backend.dto.category.admin;

import com.newcafe.backend.entity.Category;

// 관리자 카테고리 목록·상세 응답
public record CategoryResponse(
        Integer id,
        String nameKor,
        String nameEng,
        int sortOrder,
        boolean visible) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getNameKor(),
                category.getNameEng(),
                category.getSortOrder(),
                category.isVisible());
    }
}
