package com.newcafe.backend.controller.admin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.coupon.admin.LosingStreakRequest;
import com.newcafe.backend.dto.coupon.admin.LosingStreakResponse;
import com.newcafe.backend.service.admin.CouponService;

import lombok.RequiredArgsConstructor;

// 관리자용 쿠폰 관리 API (연패 위로 쿠폰). 사용자용 controller.CouponController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminCouponController")
@RequestMapping("/api/v1/admin/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    // GET /api/v1/admin/coupons/losing-streak (정책 + 지급 예정 + 최근 지급 내역)
    @GetMapping("/losing-streak")
    public LosingStreakResponse findLosingStreak() {
        return couponService.findLosingStreak();
    }

    // PUT /api/v1/admin/coupons/losing-streak (정책 수정)
    @PutMapping("/losing-streak")
    public LosingStreakResponse updateLosingStreak(@RequestBody LosingStreakRequest request) {
        return couponService.updateLosingStreak(request);
    }
}
