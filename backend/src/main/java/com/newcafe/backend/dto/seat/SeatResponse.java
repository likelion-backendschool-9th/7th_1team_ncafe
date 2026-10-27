package com.newcafe.backend.dto.seat;

import java.util.List;

import com.newcafe.backend.entity.Seat;

// 좌석 배치 응답 (프론트 Seat 타입). id는 DB id가 아니라 좌석 코드("T03")
public record SeatResponse(
        String id,
        Seat.Section section,
        Seat.Type type,
        int capacity,
        double x,
        double y,
        List<Seat.Feature> features) {

    public static SeatResponse from(Seat seat) {
        return new SeatResponse(
                seat.getCode(),
                seat.getSection(),
                seat.getType(),
                seat.getCapacity(),
                seat.getX(),
                seat.getY(),
                seat.getFeatures().stream().sorted().toList()); // 응답마다 순서가 같도록 enum 순서로
    }
}
