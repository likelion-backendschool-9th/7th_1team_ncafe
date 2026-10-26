package com.newcafe.backend.entity;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

// 경주 (races). 도착 순위는 출전마(race_horses.ranking)에 남는다.
// 마감(출발 10초 전)·경주 중 여부는 start_time으로 계산하고, status는 정산할 때만 바뀐다.
@Entity
@Table(name = "races")
@Data
@NoArgsConstructor
public class Race {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 경주 관리번호)

    @Column(nullable = false)
    private Integer no;                   // no INT (경주 번호, 화면의 "Race #13")

    @Column(nullable = false)
    private OffsetDateTime startTime;     // start_time TIMESTAMPTZ (출발 시각)

    // 시뮬레이션 난수 시드 (0 ~ 2^32-1). 지난 시드로 다음 시드를 맞힐 수 없도록 SecureRandom으로 만들고,
    // 걸기 전에 결과를 계산할 수 없도록 마감 전에는 응답에 넣지 않는다.
    @Column(nullable = false)
    private Long seed;                    // seed BIGINT (ERD에 추가한 칼럼)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Status status = Status.SCHEDULED;   // status VARCHAR(50)

    // 출전마 7마리 (race_horses). 경주를 만들 때 함께 저장한다.
    @OneToMany(mappedBy = "race", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<RaceHorse> horses = new ArrayList<>();

    // SCHEDULED: 정산 전 (출발 전·경주 중 포함) / SETTLED: 순위 확정·쿠폰 정산 완료
    public enum Status {
        SCHEDULED, SETTLED
    }
}
