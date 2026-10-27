package com.newcafe.backend.dto.seat;

import java.util.List;

// 좌석 예약 요청 (프론트 ReservationRequest 타입). branchName · chairLabels는 받지 않고 서버가 만든다
public record SeatReservationRequest(
        SeatSlotRequest slot,
        Integer people,
        List<String> chairIds) { // 의자 id ("T03-1"), 인원 수만큼
}
