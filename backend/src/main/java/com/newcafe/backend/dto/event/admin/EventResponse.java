package com.newcafe.backend.dto.event.admin;

import java.time.LocalDate;

import com.newcafe.backend.entity.Event;
import com.newcafe.backend.service.EventService;

// 관리자 이벤트 목록·상세 응답. 기간은 KST 날짜, status는 관리자 지정 상태(null이면 날짜로 자동 — 수정 폼에 그대로 돌려 보낸다)
public record EventResponse(
        Long id,
        String branchId,
        String title,
        String thumbnail,
        String imageHero,
        String imageDetail,
        String description,
        String howTo,
        String notes,
        LocalDate dateStart,
        LocalDate dateEnd,
        boolean coupon,
        Integer couponAmount,
        Integer capacity,
        Integer crowded,          // 선착순 참여 인원 (쿠폰 지급 이벤트만, 아니면 null)
        long applyCount,          // 신청 기록(events_applies) 수 — crowded와 맞는지 확인할 수 있다
        boolean visible,
        String status) {

    public static EventResponse from(Event event, long applyCount) {
        return new EventResponse(
                event.getId(),
                event.getBranchId(),
                event.getTitle(),
                event.getThumbnail(),
                event.getImageHero(),
                event.getImageDetail(),
                event.getDescription(),
                event.getHowTo(),
                event.getNotes(),
                EventService.kstDate(event.getDateStart()),
                EventService.kstDate(event.getDateEnd()),
                event.isCoupon(),
                event.getCouponAmount(),
                event.getCapacity(),
                event.getCrowded(),
                applyCount,
                event.isVisible(),
                event.getStatus() == null ? null : event.getStatus().name());
    }
}
