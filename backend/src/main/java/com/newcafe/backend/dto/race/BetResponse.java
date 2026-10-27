package com.newcafe.backend.dto.race;

import java.time.OffsetDateTime;

import com.newcafe.backend.entity.Bet;

// 걸기 응답 (걸기 결과 · 내 경주 기록)
public record BetResponse(
        Long id,
        Integer raceNo,
        OffsetDateTime startTime,
        RaceHorseResponse horse,  // 건 말 (게이트 번호·순위 포함, 정산 전 순위 null)
        int couponsIn,
        int couponsOut,           // 돌려받은 쿠폰 수 (원금 포함). 정산 전·4위 이하 0
        OffsetDateTime bettedTime,
        OffsetDateTime settledTime) {

    public static BetResponse from(Bet bet) {
        return new BetResponse(
                bet.getId(),
                bet.getRace().getNo(),
                bet.getRace().getStartTime(),
                RaceHorseResponse.from(bet.getRaceHorse()),
                bet.getCouponsIn(),
                bet.getCouponsOut(),
                bet.getBettedTime(),
                bet.getSettledTime());
    }
}
