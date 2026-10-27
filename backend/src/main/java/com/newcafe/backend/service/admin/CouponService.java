package com.newcafe.backend.service.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.dto.coupon.admin.LosingStreakRequest;
import com.newcafe.backend.dto.coupon.admin.LosingStreakResponse;
import com.newcafe.backend.entity.CouponLosingStreak;
import com.newcafe.backend.repository.CouponLogRepository;
import com.newcafe.backend.repository.CouponLosingStreakRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 쿠폰 관리 — 연패 위로 쿠폰 정책 조회 · 수정, 지급 예정 · 최근 지급 내역.
// 대상 계산 · 지급은 사용자용 service.CouponService가 한다(클래스 이름이 같아 전체 이름으로 쓴다). 빈 이름이 겹치지 않도록 이름을 지정한다.
@Service("adminCouponService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    // 정책 입력 범위 (프론트 /admin/coupons 폼과 같다)
    private static final int LOSE_STREAK_MIN = 1;
    private static final int LOSE_STREAK_MAX = 20;
    private static final int COUPONS_MIN = 1;
    private static final int COUPONS_MAX = 10;
    private static final int DELAY_MINUTES_MIN = 0;
    private static final int DELAY_MINUTES_MAX = 1440; // 하루

    private final CouponLosingStreakRepository losingStreakRepository;
    private final CouponLogRepository couponLogRepository;
    private final com.newcafe.backend.service.CouponService couponService;

    // 연패 위로 쿠폰 — 정책 + 지급 예정(정책이 꺼져 있으면 비움) + 최근 지급 내역 100건
    public LosingStreakResponse findLosingStreak() {
        return response(couponService.getLosingStreakPolicy());
    }

    // 연패 위로 쿠폰 정책 수정 — 바꾼 값은 다음 지급 판단부터 쓴다(이미 준 쿠폰은 그대로)
    @Transactional
    public LosingStreakResponse updateLosingStreak(LosingStreakRequest request) {
        if (request == null) {
            throw new BadRequestException("LOSING_STREAK_REQUEST_REQUIRED", "연패 위로 쿠폰 설정이 없습니다.");
        }
        int loseStreak = checkRange(request.loseStreak(), LOSE_STREAK_MIN, LOSE_STREAK_MAX, "LOSING_STREAK_COUNT_INVALID", "연패 수");
        int coupons = checkRange(request.coupons(), COUPONS_MIN, COUPONS_MAX, "LOSING_STREAK_COUPONS_INVALID", "지급 장수");
        int delayMinutes = checkRange(request.delayMinutes(), DELAY_MINUTES_MIN, DELAY_MINUTES_MAX,
                "LOSING_STREAK_DELAY_INVALID", "지급까지 걸리는 시간(분)");
        if (request.enabled() == null) {
            throw new BadRequestException("LOSING_STREAK_ENABLED_REQUIRED", "사용 여부를 정해야 합니다.");
        }

        CouponLosingStreak policy = couponService.getLosingStreakPolicy();
        policy.setLoseStreak(loseStreak);
        policy.setCoupons(coupons);
        policy.setDelayMinutes(delayMinutes);
        policy.setEnabled(request.enabled());
        return response(losingStreakRepository.saveAndFlush(policy));
    }

    private LosingStreakResponse response(CouponLosingStreak policy) {
        return LosingStreakResponse.from(policy,
                policy.isEnabled() ? couponService.findLosingStreakTargets(policy) : List.of(),
                couponLogRepository.findTop100ByNoteStartingWithOrderByCreatedDateDescIdDesc(
                        com.newcafe.backend.service.CouponService.LOSING_STREAK_NOTE));
    }

    private int checkRange(Integer value, int min, int max, String code, String label) {
        if (value == null || value < min || value > max) {
            throw new BadRequestException(code, label + " — " + min + "~" + max + " 사이의 정수로 입력해야 합니다.");
        }
        return value;
    }
}
