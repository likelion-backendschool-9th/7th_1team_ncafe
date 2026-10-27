package com.newcafe.backend.dto.seat;

import java.time.LocalTime;

// 예약 시간대 응답 (프론트 TimeBlock 타입). 시각은 "13:00" 형식으로 나간다
public record TimeBlockResponse(
        LocalTime start,
        LocalTime end) {
}
