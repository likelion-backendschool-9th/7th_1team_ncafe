package com.newcafe.backend.repository;

import com.newcafe.backend.entity.ReservedChair;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 예약된 의자는 SeatReservation.chairs로 함께 저장 · 삭제된다(cascade · orphanRemoval). 여기서는 조회만 한다.
public interface ReservedChairRepository extends JpaRepository<ReservedChair, Long> {
    // 한 시간대에 찬 의자 (좌석 포함) — 의자별 상태 조회 · 예약 전 중복 확인
    @EntityGraph(attributePaths = "seat")
    List<ReservedChair> findAllBySeatBranchIdAndDateAndStartTime(String branchId, LocalDate date, LocalTime startTime);

    // 한 시간대에 찬 의자 수 (수리 중 좌석 제외) — 취소 뒤 예약대기 알림 판단
    @Query("""
            select count(c) from ReservedChair c
            where c.seat.branch.id = :branchId and c.date = :date and c.startTime = :startTime
              and c.seat.underRepair = false and c.chairNo not member of c.seat.repairChairNos
            """)
    long countBySeatBranchIdAndDateAndStartTimeAndSeatUnderRepairFalse(@Param("branchId") String branchId,
            @Param("date") LocalDate date, @Param("startTime") LocalTime startTime);

    // 한 지점 · 날짜의 시간대별 찬 의자 수 (예약이 없는 시간대는 빠진다)
    // 수리 중 좌석은 잔여석 계산에서 통째로 빠지므로 그 좌석의 예약은 세지 않는다
    @Query("""
            select c.startTime as startTime, count(c) as count
              from ReservedChair c
             where c.seat.branch.id = :branchId and c.date = :date and c.seat.underRepair = false
               and c.chairNo not member of c.seat.repairChairNos
             group by c.startTime
            """)
    List<SlotCount> countGroupByStartTime(@Param("branchId") String branchId, @Param("date") LocalDate date);

    // 그 날 지점 · 시간대별 찬 의자 수 — 메인 "지점별 좌석 현황"
    @Query("""
            select c.seat.branch.id as branchId, c.startTime as startTime, count(c) as count
              from ReservedChair c
             where c.date = :date and c.seat.underRepair = false
               and c.chairNo not member of c.seat.repairChairNos
             group by c.seat.branch.id, c.startTime
            """)
    List<BranchSlotCount> countGroupByBranchAndStartTime(@Param("date") LocalDate date);

    interface SlotCount {
        LocalTime getStartTime();

        long getCount();
    }

    interface BranchSlotCount {
        String getBranchId();

        LocalTime getStartTime();

        long getCount();
    }
}
