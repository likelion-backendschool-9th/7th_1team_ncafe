package com.newcafe.backend.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 걸기 (bets). 쿠폰 coupons_in장을 걸고, 정산할 때 순위만큼 coupons_out장을 돌려받는다.
// 건 말은 race_horse로 가리킨다 (ERD의 horse_id는 race_horse와 겹쳐 뺐다).
@Entity
@Table(name = "bets")
@Data
@NoArgsConstructor
public class Bet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 베팅 관리번호)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    private Member member;                // member_no BIGINT (FK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_id")
    private Race race;                    // race_id BIGINT (FK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_horse_id")
    private RaceHorse raceHorse;          // race_horse_id BIGINT (FK, 건 말)

    @Column(nullable = false)
    private int couponsIn;                // coupons_in INT (건 쿠폰 수)

    @Column(nullable = false)
    private int couponsOut = 0;           // coupons_out INT (돌려받은 쿠폰 수, 원금 포함. 정산 전·4위 이하 0)

    @Column(nullable = false, updatable = false)
    private OffsetDateTime bettedTime;    // betted_time TIMESTAMPTZ (건 시각)

    private OffsetDateTime settledTime;   // settled_time TIMESTAMPTZ (정산 시각, 정산 전 null)

    @PrePersist
    void prePersist() {
        if (bettedTime == null) {
            bettedTime = OffsetDateTime.now();
        }
    }
}
