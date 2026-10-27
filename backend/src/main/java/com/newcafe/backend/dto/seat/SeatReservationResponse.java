package com.newcafe.backend.dto.seat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.newcafe.backend.entity.ReservedChair;
import com.newcafe.backend.entity.SeatReservation;

// 내 예약 · 예약대기 응답 (프론트 SeatReservation 타입). 예약대기는 chairIds · chairLabels가 비어 있다
// notifiedAt은 예약대기에 자리가 났을 때만 채워진다 (마이페이지 "자리가 났어요")
public record SeatReservationResponse(
        Long id,
        SeatReservation.Kind kind,
        SeatReservation.Status status,
        String branchId,
        String branchName,
        LocalDate date,
        @JsonFormat(pattern = "HH:mm") LocalTime start,
        @JsonFormat(pattern = "HH:mm") LocalTime end,
        int people,
        List<String> chairIds,
        List<String> chairLabels,
        OffsetDateTime reservedAt,
        OffsetDateTime notifiedAt) {

    public static SeatReservationResponse from(SeatReservation reservation) {
        List<ReservedChair> chairs = reservation.chairsInOrder();
        return new SeatReservationResponse(
                reservation.getId(),
                reservation.getKind(),
                reservation.getStatus(),
                reservation.getBranch().getId(),
                reservation.getBranch().getName(),
                reservation.getDate(),
                reservation.getStartTime(),
                reservation.getEndTime(),
                reservation.getPeople(),
                chairs.stream().map(ReservedChair::chairId).toList(),
                chairs.stream().map(ReservedChair::chairLabel).toList(),
                reservation.getReservedAt(),
                reservation.getNotifiedAt());
    }
}
