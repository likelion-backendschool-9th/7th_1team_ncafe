package com.newcafe.backend.dto.seat;

// 예약대기 요청 (프론트 WaitlistRequest 타입). 의자는 고르지 않는다
public record WaitlistRequest(
        SeatSlotRequest slot,
        Integer people) {
}
