package com.newcafe.backend.dto.category;

import com.newcafe.backend.entity.Category;

// 메뉴판 카테고리 탭 응답 (노출하는 카테고리만 내려간다)
public record CategoryResponse(
        Integer id,
        String nameKor,
        String nameEng) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getNameKor(),
                category.getNameEng());
    }
}
