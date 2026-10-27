package com.newcafe.backend.dto.coupon.admin;

// 연패 위로 쿠폰 정책 수정 요청 (관리자 쿠폰 관리)
public record LosingStreakRequest(
        Integer loseStreak,      // 몇 연패부터
        Integer coupons,         // 지급 장수
        Integer delayMinutes,    // 마지막 경주 정산 뒤 몇 분 뒤에
        Boolean enabled) {       // 사용 여부
}
