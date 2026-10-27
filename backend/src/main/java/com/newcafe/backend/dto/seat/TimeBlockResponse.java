package com.newcafe.backend.dto.seat;

import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

// 예약 시간대 응답 (프론트 TimeBlock 타입). 시각은 "13:00" 형식으로 나간다
public record TimeBlockResponse(
        @JsonFormat(pattern = "HH:mm") LocalTime start,
        @JsonFormat(pattern = "HH:mm") LocalTime end) {
}
