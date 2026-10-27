package com.newcafe.backend.dto.seat.admin;

import com.newcafe.backend.entity.Seat;

// 관리자 좌석 목록 응답 — 배치 좌표 대신 수리 중 여부를 보여 준다
public record SeatResponse(
        String code,
        Seat.Section section,
        Seat.Type type,
        int capacity,
        boolean underRepair,
        java.util.List<Integer> repairChairNos) {

    public static SeatResponse from(Seat seat) {
        return new SeatResponse(
                seat.getCode(),
                seat.getSection(),
                seat.getType(),
                seat.getCapacity(),
                seat.isUnderRepair(),
                seat.getRepairChairNos().stream().sorted().toList());
    }
}
