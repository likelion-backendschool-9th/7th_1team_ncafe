package com.newcafe.backend.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;

// 좌석 (seats): 테이블 · 바석 한 자리. 지점마다 따로 둔다 (수리 중 상태가 지점마다 다르다)
// 예약은 의자 단위 — 의자 id는 "{code}-{번호}" (번호는 1~capacity)
@Entity
@Table(name = "seats",
        uniqueConstraints = @UniqueConstraint(columnNames = { "branch_id", "code" }))
@Data
@NoArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Branch branch;                // branch_id VARCHAR(255) (FK → branches.id)

    @Column(nullable = false, length = 20)
    private String code;                  // code VARCHAR(20) ("T03" · "B01")

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Section section;              // section VARCHAR(20)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;                    // type VARCHAR(20)

    @Column(nullable = false)
    private int capacity;                 // capacity INT (의자 수, 바석은 1)

    // 평면도 기준 % (0~100). 이 값만 바꾸면 배치도 위치가 바뀐다
    @Column(nullable = false)
    private double x;                     // x DOUBLE (테이블 중심 x)

    @Column(nullable = false)
    private double y;                     // y DOUBLE (테이블 중심 y)

    // 좌석 특징 (seat_features)
    @ElementCollection
    @CollectionTable(name = "seat_features", joinColumns = @JoinColumn(name = "seat_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "feature", length = 20)
    private Set<Feature> features = new HashSet<>();

    // 관리자가 켜면 모든 시간대에서 REPAIR로 보이고 예약할 수 없다
    @Column(nullable = false)
    private boolean underRepair = false;  // under_repair BOOLEAN (수리 중)

    @ElementCollection
    @CollectionTable(name = "seat_chair_repairs", joinColumns = @JoinColumn(name = "seat_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"seat_id", "chair_no"}))
    @Column(name = "chair_no", nullable = false)
    private Set<Integer> repairChairNos = new HashSet<>();

    public boolean isChairUnderRepair(int no) {
        return underRepair || repairChairNos.contains(no);
    }

    public int usableCapacity() {
        return underRepair ? 0 : capacity - repairChairNos.size();
    }

    // 의자 id "T03-1" (프론트 geometry.chairId와 같은 규칙)
    public String chairId(int chairNo) {
        return code + "-" + chairNo;
    }

    public enum Section {
        TRACKSIDE,  // 창가 좌석
        GRANDSTAND, // 일반 좌석
        PADDOCK,    // 바 좌석
        LOUNGE      // 단체 좌석
    }

    public enum Type {
        TABLE, BAR
    }

    public enum Feature {
        WINDOW,       // 창가
        OUTLET,       // 콘센트
        QUIET,        // 조용한 자리
        GROUP,        // 단체석
        NEAR_COUNTER, // 카운터 근처
        BAR           // 바 좌석
    }
}
