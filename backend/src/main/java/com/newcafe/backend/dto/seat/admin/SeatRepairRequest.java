package com.newcafe.backend.dto.seat.admin;

// 관리자 좌석 수리 중 설정 · 해제 요청
public record SeatRepairRequest(
        Boolean underRepair,
        java.util.List<Long> acknowledgedReservationIds) {
}
