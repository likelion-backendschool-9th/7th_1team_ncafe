package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Seat;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 기본 CRUD는 JpaRepository가 제공한다.
//   등록: save(seat) / saveAll(seats)  (초기 데이터)
//   수정: 영속 상태의 seat 필드를 바꾸면 반영 (수리 중 설정 등)
public interface SeatRepository extends JpaRepository<Seat, Long> {
    // 한 지점의 좌석 배치 (특징 포함)
    @EntityGraph(attributePaths = "features")
    List<Seat> findAllByBranchIdOrderByIdAsc(String branchId);

    // 한 지점의 좌석 하나 — 관리자 수리 중 설정
    Optional<Seat> findByBranchIdAndCode(String branchId, String code);

    // 한 지점의 수리 중 좌석 — 의자 상태에서 REPAIR로 표시
    List<Seat> findAllByBranchIdAndUnderRepairTrue(String branchId);

    // 한 지점에서 코드로 좌석 찾기 — 예약 요청의 의자 id("T03-1")에서 좌석 코드만 뽑아 조회한다
    List<Seat> findAllByBranchIdAndCodeIn(String branchId, Collection<String> codes);

    // 한 지점에서 예약할 수 있는 의자 수 (수리 중 좌석 제외) — 취소 뒤 예약대기 알림 판단
    @Query("select coalesce(sum(s.capacity), 0) from Seat s where s.branch.id = :branchId and s.underRepair = false")
    long sumUsableCapacity(@Param("branchId") String branchId);
}
