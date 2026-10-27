package com.newcafe.backend.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import com.newcafe.backend.dto.seat.SlotAvailabilityResponse.BlockState;
import com.newcafe.backend.dto.seat.TimeBlockResponse;

// 좌석 예약 시간표 — 1시간 블록 13개(09:00~22:00), 오늘부터 14일, 한 번에 8명까지
// 프론트 seat/_data/schedule.ts · _lib/schedule.ts와 같은 값 · 규칙이어야 한다
public final class SeatSchedule {

    public static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // 오늘 포함 예약할 수 있는 날 수
    public static final int BOOKING_DAYS = 14;

    // 한 번에 예약할 수 있는 최대 인원 (= 의자 수)
    public static final int MAX_PEOPLE = 8;

    private static final LocalTime FIRST_START = LocalTime.of(9, 0);
    private static final int BLOCK_COUNT = 13;
    private static final Duration BLOCK_LENGTH = Duration.ofHours(1);

    public static final List<TimeBlockResponse> TIME_BLOCKS = IntStream.range(0, BLOCK_COUNT)
            .mapToObj(i -> FIRST_START.plus(BLOCK_LENGTH.multipliedBy(i)))
            .map(start -> new TimeBlockResponse(start, start.plus(BLOCK_LENGTH)))
            .toList();

    private SeatSchedule() {
    }

    // 지금 (KST)
    public static LocalDateTime now() {
        return LocalDateTime.now(KST);
    }

    // 시작 시각으로 시간대 찾기 — 시간표에 없는 시각이면 비어 있다
    public static Optional<TimeBlockResponse> findBlock(LocalTime start) {
        return TIME_BLOCKS.stream().filter(b -> b.start().equals(start)).findFirst();
    }

    // 지나간 시간대는 CLOSED, 오늘 지금 진행 중이면 LIVE, 나머지는 OPEN
    public static BlockState stateOf(LocalDate date, TimeBlockResponse block, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        if (date.isBefore(today)) return BlockState.CLOSED;
        if (date.isAfter(today)) return BlockState.OPEN;
        LocalTime time = now.toLocalTime();
        if (!time.isBefore(block.end())) return BlockState.CLOSED;
        if (!time.isBefore(block.start())) return BlockState.LIVE;
        return BlockState.OPEN;
    }

    // 기본 날짜 — 오늘, 오늘 시간대가 모두 지났으면(영업 종료 뒤) 내일
    public static LocalDate defaultDate(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        boolean hasOpenBlock = TIME_BLOCKS.stream().anyMatch(b -> stateOf(today, b, now) != BlockState.CLOSED);
        return hasOpenBlock ? today : today.plusDays(1);
    }

    // 예약할 수 있는 날인지 — 오늘부터 BOOKING_DAYS일
    public static boolean isBookableDate(LocalDate date, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        return !date.isBefore(today) && date.isBefore(today.plusDays(BOOKING_DAYS));
    }
}
