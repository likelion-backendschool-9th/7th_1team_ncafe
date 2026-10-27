package com.newcafe.backend.repository;

import com.newcafe.backend.entity.SeatReservation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 기본 CRUD는 JpaRepository가 제공한다.
//   예약 · 예약대기: saveAndFlush(reservation)  (의자는 reservation.chairs에 담아 함께 저장. flush로 중복 의자를 바로 확인)
//   취소: 영속 상태의 reservation.status를 바꾸고 chairs를 비운다
public interface SeatReservationRepository extends JpaRepository<SeatReservation, Long> {
    @EntityGraph(attributePaths = { "member", "chairs", "chairs.seat" })
    @Query("""
            select distinct r from SeatReservation r join r.chairs c
            where c.seat.id = :seatId and (:chairNo is null or c.chairNo = :chairNo)
              and r.status in :statuses
              and (r.date > :date or (r.date = :date and r.endTime > :time))
            order by r.date, r.startTime, r.id
            """)
    List<SeatReservation> findRepairConflicts(@Param("seatId") Long seatId, @Param("chairNo") Integer chairNo,
            @Param("date") LocalDate date, @Param("time") LocalTime time,
            @Param("statuses") Collection<SeatReservation.Status> statuses);
    // 내 예약 목록, 최신순 (지점 · 의자 포함)
    @EntityGraph(attributePaths = { "branch", "chairs", "chairs.seat" })
    List<SeatReservation> findAllByMemberNoAndStatusInOrderByReservedAtDesc(Long memberNo,
            Collection<SeatReservation.Status> statuses);

    // 예약 하나 (의자 포함) — 취소 · 관리자 처리
    @EntityGraph(attributePaths = { "member", "branch", "chairs", "chairs.seat" })
    Optional<SeatReservation> findWithChairsById(Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from SeatReservation r where r.id = :id")
    Optional<SeatReservation> findForAdminUpdate(@Param("id") Long id);

    // 같은 시간대에 이미 예약 · 예약대기가 있는지 — 같은 시간대 중복 신청 확인
    boolean existsByMemberNoAndBranchIdAndDateAndStartTimeAndKindAndStatus(Long memberNo, String branchId,
            LocalDate date, LocalTime startTime, SeatReservation.Kind kind, SeatReservation.Status status);

    // 앞으로 남은 예약 수 (from 날짜 이후) — 1인 동시 예약 수 제한
    long countByMemberNoAndKindAndStatusAndDateGreaterThanEqual(Long memberNo, SeatReservation.Kind kind,
            SeatReservation.Status status, LocalDate from);

    // 최근 노쇼 수 (from 날짜 이후) — 노쇼가 쌓이면 예약 제한
    long countByMemberNoAndStatusAndDateGreaterThanEqual(Long memberNo, SeatReservation.Status status, LocalDate from);

    // 한 지점 · 날짜의 예약 목록, 시간대순 (회원 · 의자 포함) — 관리자 예약 현황
    @EntityGraph(attributePaths = { "member", "chairs", "chairs.seat" })
    List<SeatReservation> findAllByBranchIdAndDateOrderByStartTimeAscReservedAtAsc(String branchId, LocalDate date);

    // 한 시간대의 유효한 예약대기 중 인원이 available 이하인 것에 알림 시각을 남긴다. 변경된 행 수를 반환한다.
    @Modifying(flushAutomatically = true)
    @Query("""
            update SeatReservation r
               set r.notifiedAt = :now
             where r.branch.id = :branchId and r.date = :date and r.startTime = :startTime
               and r.kind = :kind and r.status = :status and r.people <= :available
            """)
    int markNotified(@Param("branchId") String branchId,
                     @Param("date") LocalDate date,
                     @Param("startTime") LocalTime startTime,
                     @Param("available") int available,
                     @Param("now") OffsetDateTime now,
                     @Param("kind") SeatReservation.Kind kind,
                     @Param("status") SeatReservation.Status status);

    // 한 회원의 한 시간대 유효한 예약대기를 취소한다 — 그 시간대를 예약했으면 대기는 필요 없다. 변경된 행 수를 반환한다.
    @Modifying(flushAutomatically = true)
    @Query("""
            update SeatReservation r
               set r.status = :canceled, r.canceledAt = :now
             where r.member.no = :memberNo and r.branch.id = :branchId
               and r.date = :date and r.startTime = :startTime
               and r.kind = :kind and r.status = :status
            """)
    int cancelWaiting(@Param("memberNo") Long memberNo,
                      @Param("branchId") String branchId,
                      @Param("date") LocalDate date,
                      @Param("startTime") LocalTime startTime,
                      @Param("now") OffsetDateTime now,
                      @Param("kind") SeatReservation.Kind kind,
                      @Param("status") SeatReservation.Status status,
                      @Param("canceled") SeatReservation.Status canceled);
}
