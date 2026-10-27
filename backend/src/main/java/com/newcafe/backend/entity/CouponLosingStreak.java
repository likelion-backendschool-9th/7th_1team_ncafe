package com.newcafe.backend.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 연패 위로 쿠폰 정책 (coupons_losing_streak). 행은 1개(id = 1)이고 관리자 쿠폰 관리 화면에서 바꾼다.
// lose_streak연패 이상이고 쿠폰이 0장인 회원에게, 마지막 경주 정산 delay_minutes분 뒤 coupons장을 준다(연패 한 번에 한 번).
// 지급 기록은 따로 두지 않고 coupons_log에 남긴다(note가 "연패 위로 쿠폰"으로 시작 — CouponService).
@Entity
@Table(name = "coupons_losing_streak")
@Data
@NoArgsConstructor
public class CouponLosingStreak {

    @Id
    private Long id;                      // id BIGINT (PK, 항상 1)

    @Column(nullable = false)
    private int loseStreak;               // lose_streak INT (몇 연패부터 지급할지)

    @Column(nullable = false)
    private int coupons;                  // coupons INT (지급 장수)

    @Column(nullable = false)
    private int delayMinutes;             // delay_minutes INT (마지막 경주 정산 뒤 지급까지 걸리는 분)

    @Column(nullable = false)
    private boolean enabled;              // enabled BOOLEAN (사용 여부)

    @Column(nullable = false)
    private OffsetDateTime updatedTime;   // updated_time TIMESTAMPTZ (마지막 수정 시각)

    @PrePersist
    @PreUpdate
    void touch() {
        updatedTime = OffsetDateTime.now();
    }
}
