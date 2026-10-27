package com.newcafe.backend.repository;

import com.newcafe.backend.entity.CouponLosingStreak;

import org.springframework.data.jpa.repository.JpaRepository;

// 기본 CRUD는 JpaRepository가 제공한다.
//   정책 조회: findById(1L) · 수정: 영속 상태의 정책을 고친 뒤 save
public interface CouponLosingStreakRepository extends JpaRepository<CouponLosingStreak, Long> {
}
