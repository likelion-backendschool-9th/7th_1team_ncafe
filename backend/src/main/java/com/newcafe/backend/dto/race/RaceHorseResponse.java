package com.newcafe.backend.dto.race;

import com.newcafe.backend.entity.RaceHorse;

// 경주별 출전마 응답: 그 경주의 주행 성향·게이트 번호·순위·컨디션 + 말 정보
public record RaceHorseResponse(
        HorseResponse horse,      // 말 정보(이름·색·이미지 등은 지금 값)
        String trait,             // 이 경주에서 쓴 주행 성향(race_horses.trait) — 경기 화면 시뮬레이션은 horse.trait가 아니라 이 값을 쓴다
        Integer gateNo,           // 앞 경주가 정산되기 전이면 null
        Integer ranking,          // 정산 전 null
        String condition) {

    public static RaceHorseResponse from(RaceHorse raceHorse) {
        return new RaceHorseResponse(
                HorseResponse.from(raceHorse.getHorse()),
                raceHorse.getTrait().name(),
                raceHorse.getGateNo(),
                raceHorse.getRanking(),
                raceHorse.getCondition() == null ? null : raceHorse.getCondition().name());
    }
}
