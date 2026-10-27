package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Grade;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GradeRepository extends JpaRepository<Grade, Integer> {
    // 등급 목록 (필요 누적 쿠폰이 적은 순 = 낮은 등급부터)
    List<Grade> findAllByOrderByMinTotalCouponsAsc();

    // 누적 쿠폰으로 닿는 가장 높은 등급
    Optional<Grade> findTopByMinTotalCouponsLessThanEqualOrderByMinTotalCouponsDesc(int totalEarnedCoupons);
}
