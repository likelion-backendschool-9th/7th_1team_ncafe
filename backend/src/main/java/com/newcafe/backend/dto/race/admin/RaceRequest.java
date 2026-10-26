package com.newcafe.backend.dto.race.admin;

import java.time.OffsetDateTime;

// 관리자 경주 추가 요청 — 출발 시각만 받는다(예: "2026-10-29T18:00:00+09:00").
// 경주 번호·시드·출전마 7마리(성향 사본·게이트 번호·컨디션)는 서버가 채운다.
public record RaceRequest(OffsetDateTime startTime) {
}
