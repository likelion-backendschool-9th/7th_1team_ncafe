package com.newcafe.backend.dto.event.admin;

import java.time.LocalDate;

// 관리자 이벤트 등록·수정 요청. 기간은 KST 날짜("2026-10-20")로 받는다(시작일 00:00 · 종료일 23:59:59 KST로 저장).
// 참여 인원(crowded)은 신청으로만 늘어나 받지 않는다
public record EventRequest(
        String branchId,
        String title,
        String thumbnail,
        String imageHero,
        String imageDetail,
        String description,
        String howTo,               // 한 줄에 하나
        String notes,               // 한 줄에 하나
        LocalDate dateStart,        // null이면 이미 시작
        LocalDate dateEnd,          // null이면 상시
        Boolean coupon,             // true면 선착순 쿠폰 지급 이벤트
        Integer couponAmount,       // coupon이 true일 때 1~99
        Integer capacity,           // coupon이 true일 때 선착순 마감 인원 1~9999
        Boolean visible,
        String status) {            // UPCOMING · ONGOING · ENDED, null이면 날짜로 자동

    // PATCH /api/v1/admin/events/{id}/visible — 노출 허가만 바꾼다
    public record Visible(Boolean visible) {
    }

    // PATCH /api/v1/admin/events/{id}/status — 상태 직접 지정만 바꾼다(null이면 날짜로 자동)
    public record Status(String status) {
    }
}
