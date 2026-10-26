package com.newcafe.backend.dto.coupon;

import java.util.List;

import com.newcafe.backend.entity.CouponLog;
import com.newcafe.backend.entity.Member;

// 내 쿠폰 응답 — 보유 쿠폰 수 + 증감 내역(최신순). WBS 10.1~10.3 · 19.4 (GET /api/v1/me/coupons)
public record CouponResponse(
        int couponCount,
        List<CouponLogResponse> history) {

    public static CouponResponse from(Member member, List<CouponLog> logs) {
        return new CouponResponse(member.getCouponCount(), logs.stream().map(CouponLogResponse::from).toList());
    }
}
