package com.newcafe.backend.dto.seat.admin;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.newcafe.backend.entity.ReservedChair;
import com.newcafe.backend.entity.SeatReservation;

// 관리자 예약 현황 응답 — 사용자용 응답에 예약한 회원 · 취소 시각을 더한다
public record SeatReservationResponse(
        Long id,
        SeatReservation.Kind kind,
        SeatReservation.Status status,
        Long memberNo,
        String memberNickname,
        LocalDate date,
        @JsonFormat(pattern = "HH:mm") LocalTime start,
        @JsonFormat(pattern = "HH:mm") LocalTime end,
        int people,
        List<String> chairIds,
        List<String> chairLabels,
        OffsetDateTime reservedAt,
        OffsetDateTime canceledAt) {

    public static SeatReservationResponse from(SeatReservation reservation) {
        return new SeatReservationResponse(
                reservation.getId(),
                reservation.getKind(),
                reservation.getStatus(),
                reservation.getMember().getNo(),
                reservation.getMember().getNickname(),
                reservation.getDate(),
                reservation.getStartTime(),
                reservation.getEndTime(),
                reservation.getPeople(),
                reservation.chairsInOrder().stream().map(ReservedChair::chairId).toList(),
                reservation.chairsInOrder().stream().map(ReservedChair::chairLabel).toList(),
                reservation.getReservedAt(),
                reservation.getCanceledAt());
    }
}
