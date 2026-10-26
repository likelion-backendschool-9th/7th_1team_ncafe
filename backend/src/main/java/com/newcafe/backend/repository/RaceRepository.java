package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Race;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 기본 CRUD는 JpaRepository가 제공한다.
//   경주 등록: save(race)  (출전마는 race.horses에 담아 함께 저장 — cascade)
//   경주 삭제: delete(race)  (출전마도 함께 삭제 — orphanRemoval)
//   정산: 영속 상태의 race.status · race.horses의 순위를 수정한 뒤 save(race)
public interface RaceRepository extends JpaRepository<Race, Long> {
    // 경주 상세 (출전마·말 정보 포함)
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    Optional<Race> findByNo(Integer no);

    // 다음 경주: 이 시각 뒤에 출발하는 경주 중 가장 이른 것 (출전마·말 정보 포함)
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    Optional<Race> findFirstByStartTimeAfterOrderByStartTimeAsc(OffsetDateTime time);

    // 앞 경주: 이 시각 전에 출발한 경주 중 가장 늦은 것 — 게이트 번호를 정할 때 그 경주의 도착 순서를 본다
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    Optional<Race> findFirstByStartTimeBeforeOrderByStartTimeDesc(OffsetDateTime time);

    // 이 시각 뒤에 출발하는 경주 전부, 이른 순 — 성향 사본 수정
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    List<Race> findAllByStartTimeAfterOrderByStartTimeAsc(OffsetDateTime time);

    // 경주 일정: 이 시각(오늘 0시) 이후의 경주, 이른 순
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    List<Race> findAllByStartTimeGreaterThanEqualOrderByStartTimeAsc(OffsetDateTime from);

    // 지난 경주 기록: status가 SETTLED인 경주, 최신순 (출전마·말 정보 포함)
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    List<Race> findAllByStatusOrderByStartTimeDesc(Race.Status status);

    // 정산할 경주: 결과 확정 시각(출발 + 19.5초)이 지났는데 아직 SCHEDULED인 경주 중 가장 오래된 것 — 정산은 출발 순서대로 하나씩
    //   예) findFirstByStatusAndStartTimeBeforeOrderByStartTimeAsc(Race.Status.SCHEDULED, now.minus(RaceService.RACE_SETTLE))
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    Optional<Race> findFirstByStatusAndStartTimeBeforeOrderByStartTimeAsc(Race.Status status, OffsetDateTime time);

    // 관리자 경주 목록 (최신순, 출전마·말 정보 포함)
    @EntityGraph(attributePaths = {"horses", "horses.horse"})
    List<Race> findAllByOrderByStartTimeDesc();

    // from과 to 사이(양 끝 제외)에 출발하는 경주 — 경주 사이 20분 간격 확인
    @Query("select r from Race r where r.startTime > :from and r.startTime < :to order by r.startTime")
    List<Race> findAllStartingBetween(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    // from ~ to(양 끝 포함)에 출발한 경주가 있는지 — 앞 경주가 아직 달리는 중인지 확인
    boolean existsByStartTimeBetween(OffsetDateTime from, OffsetDateTime to);

    // 이 시각 전에 출발하는 경주 수 — 경주 번호는 출발 순서대로 매긴다
    long countByStartTimeBefore(OffsetDateTime time);

    // 이 시각 뒤에 출발하는 경주들의 번호를 delta만큼 옮긴다 (경주 추가 +1 · 삭제 -1)
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Race r set r.no = r.no + :delta where r.startTime > :time")
    int shiftNoAfter(@Param("time") OffsetDateTime time, @Param("delta") int delta);
}
