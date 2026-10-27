package com.newcafe.backend.dto.category.admin;

// 관리자 카테고리 추가·수정 요청. 노출 순서는 순서 변경 API로만 바꾼다.
public record CategoryRequest(
        String nameKor,
        String nameEng,
        Boolean visible) {
}
