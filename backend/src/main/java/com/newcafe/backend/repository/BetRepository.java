package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Bet;
import com.newcafe.backend.entity.Race;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

// 기본 CRUD는 JpaRepository가 제공한다.
//   걸기: save(bet)
//   정산: 영속 상태의 bet에 coupons_out·settled_time을 채운 뒤 save(bet)
public interface BetRepository extends JpaRepository<Bet, Long> {
    // 이 회원이 이 경주에 이미 걸었는지 (경주당 한 번)
    boolean existsByMemberNoAndRaceId(Long memberNo, Long raceId);

    // 이 경주에 걸린 쿠폰이 있는지 — 쿠폰이 걸린 경주는 삭제할 수 없다
    boolean existsByRaceId(Long raceId);

    // 이 시각 뒤에 출발하는 경주에 걸린 쿠폰이 있는지 — 쿠폰이 걸린 경주 앞에는 경주를 끼워 넣을 수 없다(번호가 바뀐다)
    boolean existsByRaceStartTimeAfter(OffsetDateTime time);

    // 정산할 걸기: 이 경주에 걸고 아직 정산하지 않은 것 (회원·건 말 포함)
    @EntityGraph(attributePaths = {"member", "raceHorse"})
    List<Bet> findAllByRaceAndSettledTimeIsNull(Race race);

    // 내 걸기 기록, 최신순 (경주·건 말·말 정보 포함)
    @EntityGraph(attributePaths = {"race", "raceHorse", "raceHorse.horse"})
    List<Bet> findAllByMemberNoOrderByBettedTimeDesc(Long memberNo);

    // 회원의 마지막 걸기 (경주 포함) — 연패 위로 쿠폰: 마지막 걸기가 정산된 4위 이하인지 · 그 정산 시각
    @EntityGraph(attributePaths = "race")
    Optional<Bet> findFirstByMemberNoOrderByBettedTimeDesc(Long memberNo);

    // 회원이 마지막으로 3위 안에 든(쿠폰을 돌려받은) 걸기 — 그 뒤부터가 이번 연패
    Optional<Bet> findFirstByMemberNoAndCouponsOutGreaterThanOrderBySettledTimeDesc(Long memberNo, int couponsOut);
}
