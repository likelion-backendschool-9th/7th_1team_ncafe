package com.newcafe.backend.dto.coupon;

import java.time.OffsetDateTime;

import com.newcafe.backend.entity.CouponLog;

// 쿠폰 증감 내역 한 줄
public record CouponLogResponse(
        Long id,
        int delta,                // +적립 / -사용
        String note,              // 사유 문구 — "Race #13 · 3번 MOCHA 참가"
        OffsetDateTime createdDate) {

    public static CouponLogResponse from(CouponLog log) {
        return new CouponLogResponse(log.getId(), log.getDelta(), log.getNote(), log.getCreatedDate());
    }
}
