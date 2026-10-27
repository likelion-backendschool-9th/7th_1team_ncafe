package com.newcafe.backend.dto.grade;

import com.newcafe.backend.entity.Grade;

// 회원 등급 (누적 쿠폰 기준). 메뉴의 해금 등급으로도 쓴다.
public record GradeResponse(
        Integer id,
        String name,
        int minTotalCoupons) {

    public static GradeResponse from(Grade grade) {
        return new GradeResponse(grade.getId(), grade.getName(), grade.getMinTotalCoupons());
    }
}
