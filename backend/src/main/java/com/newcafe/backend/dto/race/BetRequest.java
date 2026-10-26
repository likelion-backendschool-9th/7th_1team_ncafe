package com.newcafe.backend.dto.race;

// 걸기 요청. 경주 번호는 경로(/races/{raceNo}/bets)로, 건 말은 말 관리번호(horses.id)로 받는다.
public record BetRequest(Long horseId) {
}
