package com.newcafe.backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.coupon.CouponResponse;
import com.newcafe.backend.dto.coupon.MyLosingStreakResponse;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.CouponService;

import lombok.RequiredArgsConstructor;

// 내 쿠폰 API — 로그인한 회원 기준(보유 수 + 증감 내역). 쿠폰 사용 · 적립은 걸기 · 주문 · 정산 API 안에서 CouponService가 처리한다
@RestController
@RequestMapping("/api/v1/me/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    // GET /api/v1/me/coupons
    @GetMapping
    public CouponResponse findMine(Authentication authentication) {
        return couponService.findMine(AuthService.loginMemberNo(authentication));
    }

    // GET /api/v1/me/coupons/losing-streak (연패 수 · 위로 쿠폰 지급 예정 시각 · 최근 위로 쿠폰)
    @GetMapping("/losing-streak")
    public MyLosingStreakResponse findMyLosingStreak(Authentication authentication) {
        return couponService.findMyLosingStreak(AuthService.loginMemberNo(authentication));
    }
}
