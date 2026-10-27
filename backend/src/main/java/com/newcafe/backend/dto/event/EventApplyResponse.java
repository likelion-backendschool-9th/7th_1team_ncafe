package com.newcafe.backend.dto.event;

import java.time.OffsetDateTime;

import com.newcafe.backend.entity.EventApply;

// 이벤트 참여 응답 (참여 결과 · 내 참여 기록 · 관리자 참여자 목록).
// 이벤트의 지점 · 종류 · 지급 쿠폰 수를 함께 준다 — 내 참여 기록은 지금 손님 화면에 보이지 않는(종료 · 숨김) 이벤트도 보여 주므로
public record EventApplyResponse(
        Long applyId,
        Long eventId,
        String eventTitle,
        String branchId,
        boolean coupon,
        Integer couponAmount,     // 쿠폰 지급 이벤트의 한 명당 쿠폰 수 (신청자가 생기면 바꿀 수 없어 받은 수와 같다)
        Long memberNo,
        String loginId,
        String nickname,
        OffsetDateTime appliedDate) {

    public static EventApplyResponse from(EventApply apply) {
        return new EventApplyResponse(
                apply.getId(),
                apply.getEvent().getId(),
                apply.getEvent().getTitle(),
                apply.getEvent().getBranchId(),
                apply.getEvent().isCoupon(),
                apply.getEvent().getCouponAmount(),
                apply.getMember().getNo(),
                apply.getMember().getLoginId(),
                apply.getMember().getNickname(),
                apply.getAppliedDate());
    }
}
