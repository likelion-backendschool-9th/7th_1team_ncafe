package com.newcafe.backend.repository;

import com.newcafe.backend.entity.CouponLog;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

// 기본 CRUD는 JpaRepository가 제공한다.
//   내역 남기기: save(couponLog)  (쿠폰 수 변경과 같은 트랜잭션 — CouponService)
// 내역은 고치거나 지우지 않는다. 연패 위로 쿠폰은 note 앞부분(notePrefix)으로 구분한다.
public interface CouponLogRepository extends JpaRepository<CouponLog, Long> {
    // 회원의 쿠폰 내역, 최신순 (같은 시각이면 나중에 쌓인 내역이 앞)
    List<CouponLog> findAllByMemberNoOrderByCreatedDateDescIdDesc(Long memberNo);

    // 이 시각 뒤에 이 문구로 시작하는 내역이 있는지 — 이번 연패에 위로 쿠폰을 이미 받았는지
    boolean existsByMemberNoAndNoteStartingWithAndCreatedDateAfter(Long memberNo, String notePrefix, OffsetDateTime after);

    // 이 문구로 시작하는 내역이 한 번이라도 있는지 — 3위 안에 든 적이 없는 회원용
    boolean existsByMemberNoAndNoteStartingWith(Long memberNo, String notePrefix);

    // 회원의 가장 최근 위로 쿠폰 내역 — 사용자 화면 모달
    Optional<CouponLog> findFirstByMemberNoAndNoteStartingWithOrderByCreatedDateDescIdDesc(Long memberNo, String notePrefix);

    // 최근 위로 쿠폰 지급 내역 100건 (회원 포함) — 관리자 쿠폰 관리
    @EntityGraph(attributePaths = "member")
    List<CouponLog> findTop100ByNoteStartingWithOrderByCreatedDateDescIdDesc(String notePrefix);
}
