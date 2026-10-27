package com.newcafe.backend.dto.race;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

import com.newcafe.backend.entity.Race;
import com.newcafe.backend.entity.RaceHorse;

// 경주 응답 (출전표 · 일정 · 결과 · 지난 경주 기록 · 관리자 경주 목록)
public record RaceResponse(
        Integer no,
        OffsetDateTime startTime,
        String status,
        Long seed,                // 마감(출발 10초 전) 전에는 null. 걸기 전에 결과를 계산할 수 없게 한다
        List<RaceHorseResponse> horses) {

    // seedOpen: 마감이 지났는지(service.RaceService.isSeedOpen). 출전마는 말 관리번호 순 = 시뮬레이션에 넘기는 순서
    public static RaceResponse from(Race race, boolean seedOpen) {
        return new RaceResponse(
                race.getNo(),
                race.getStartTime(),
                race.getStatus().name(),
                seedOpen ? race.getSeed() : null,
                race.getHorses().stream()
                        .sorted(Comparator.comparing((RaceHorse rh) -> rh.getHorse().getId()))
                        .map(RaceHorseResponse::from)
                        .toList());
    }
}
