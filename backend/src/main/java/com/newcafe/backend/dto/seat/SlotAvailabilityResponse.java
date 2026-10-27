package com.newcafe.backend.dto.seat;

import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

// 시간대 하나의 잔여석 응답 (프론트 SlotAvailability 타입)
public record SlotAvailabilityResponse(
        @JsonFormat(pattern = "HH:mm") LocalTime start,
        @JsonFormat(pattern = "HH:mm") LocalTime end,
        BlockState state,
        int available,          // 빈 의자 수
        int total) {            // 전체 의자 수

    public enum BlockState {
        OPEN,   // 예약 가능
        LIVE,   // 지금 진행 중 (오늘만)
        CLOSED  // 지나간 시간대
    }
}
