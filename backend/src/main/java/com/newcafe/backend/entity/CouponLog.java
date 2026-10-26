package com.newcafe.backend.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 쿠폰 증감 내역 (coupons_log). 보유 쿠폰 수는 members.coupon_count에 있고, 바뀔 때마다 여기에 한 줄씩 쌓는다.
// coupon_count와 delta 합계가 어긋나지 않도록 CouponService가 둘을 한 트랜잭션에서 바꾼다.
@Entity
@Table(name = "coupons_log")
@Data
@NoArgsConstructor
public class CouponLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "coupon_log_id")
    private Long id;                      // coupon_log_id BIGINT (PK, 쿠폰 내역 관리번호)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    private Member member;                // member_no BIGINT (FK)

    @Column(nullable = false)
    private int delta;                    // delta INT (+적립 / -사용)

    @Column(nullable = false, length = 100)
    private String note;                  // note VARCHAR(100) (사유 문구, 예: "Race #13 · 3번 MOCHA 참가")

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdDate;   // created_date TIMESTAMPTZ

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = OffsetDateTime.now();
        }
    }
}
