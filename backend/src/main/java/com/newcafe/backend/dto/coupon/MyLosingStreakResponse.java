package com.newcafe.backend.dto.coupon;

import java.time.OffsetDateTime;

// 내 연패 위로 쿠폰 상태 — 사용자 화면이 지급 예정 시각에 다시 묻고, 새로 받은 위로 쿠폰을 모달로 알린다
public record MyLosingStreakResponse(
        int loseStreak,              // 지금 연패 수 (3위 안에 들면 0)
        OffsetDateTime dueTime,      // 위로 쿠폰 지급 예정 시각 — 대상이 아니거나 정책이 꺼져 있으면 null
        int coupons,                 // 지급 장수(정책)
        CouponLogResponse latest) {  // 가장 최근에 받은 위로 쿠폰 내역 — 없으면 null
}
