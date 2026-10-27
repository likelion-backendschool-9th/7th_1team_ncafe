package com.newcafe.backend.dto.coupon.admin;

import java.time.OffsetDateTime;
import java.util.List;

import com.newcafe.backend.entity.CouponLog;
import com.newcafe.backend.entity.CouponLosingStreak;
import com.newcafe.backend.service.CouponService.LosingStreakTarget;

// 관리자 쿠폰 관리 — 연패 위로 쿠폰 정책 + 지급 예정(지금 조건을 채운 회원) + 최근 지급 내역(coupons_log)
public record LosingStreakResponse(
        int loseStreak,
        int coupons,
        int delayMinutes,
        boolean enabled,
        OffsetDateTime updatedTime,
        List<Pending> pending,
        List<Grant> grants) {

    // 지급 예정 한 명 — 마지막 경주 정산 시각 + 지연 시간이 지나면 지급된다
    public record Pending(Long memberNo, String loginId, String nickname, int loseStreak, Integer raceNo, OffsetDateTime dueTime) {
        static Pending from(LosingStreakTarget target) {
            return new Pending(target.memberNo(), target.loginId(), target.nickname(), target.loseStreak(),
                    target.raceNo(), target.dueTime());
        }
    }

    // 지급 내역 한 줄 (coupons_log)
    public record Grant(Long id, Long memberNo, String loginId, String nickname, int coupons, String note, OffsetDateTime createdDate) {
        static Grant from(CouponLog log) {
            return new Grant(log.getId(), log.getMember().getNo(), log.getMember().getLoginId(), log.getMember().getNickname(),
                    log.getDelta(), log.getNote(), log.getCreatedDate());
        }
    }

    public static LosingStreakResponse from(CouponLosingStreak policy, List<LosingStreakTarget> pending, List<CouponLog> grants) {
        return new LosingStreakResponse(policy.getLoseStreak(), policy.getCoupons(), policy.getDelayMinutes(),
                policy.isEnabled(), policy.getUpdatedTime(),
                pending.stream().map(Pending::from).toList(),
                grants.stream().map(Grant::from).toList());
    }
}
