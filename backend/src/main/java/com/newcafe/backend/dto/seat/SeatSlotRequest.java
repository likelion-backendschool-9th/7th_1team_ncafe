package com.newcafe.backend.dto.seat;

import java.time.LocalDate;
import java.time.LocalTime;

// 예약 · 예약대기 요청의 시간대 (프론트 SeatSlot 타입). 끝 시각(end)은 받지 않고 서버가 시작 시각으로 정한다
public record SeatSlotRequest(
        String branchId,
        LocalDate date,         // "2026-10-17" (KST)
        LocalTime start) {      // "13:00"
}
