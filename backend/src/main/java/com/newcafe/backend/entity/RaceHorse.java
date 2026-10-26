package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 경주별 출전마 (race_horses). 게이트 번호·컨디션은 경주를 만들 때, 순위는 정산할 때 채운다.
// ERD의 복합키(id, race_id, horse_id) 대신 id 단일 PK로 두어 bets.race_horse_id가 id 하나로 가리킨다.
@Entity
@Table(name = "race_horses")
@Data
@NoArgsConstructor
public class RaceHorse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 출전한 말 관리번호)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_id")
    private Race race;                    // race_id BIGINT (FK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "horse_id")
    private Horse horse;                  // horse_id BIGINT (FK)

    // 이 경주에서 쓴 주행 성향 — horses.trait의 사본(order_items.unit_price와 같은 개념). 경주 순위 계산의 입력이라
    // 경주를 만들 때 복사하고, 관리자가 성향을 바꾸면 아직 마감(출발 10초 전) 전인 경주의 사본만 함께 고친다.
    // 마감 뒤에는 바뀌지 않으므로 같은 시드와 이 값으로 언제든 그 경주를 똑같이 다시 계산할 수 있다.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Horse.Trait trait;            // trait VARCHAR(12) (ERD에 추가한 칼럼)

    private Integer gateNo;               // gate_no INT (게이트 번호 1~7, 지난 경주 도착 순)

    private Integer ranking;              // ranking INT (도착 순위 1~7, 정산 전 null)

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Condition condition;          // condition VARCHAR(50) (오늘의 컨디션, 표시용)

    // 표시용 컨디션. 경주 순위 계산에는 쓰지 않는다.
    public enum Condition {
        BEST, GOOD, NORMAL, LOW
    }
}
