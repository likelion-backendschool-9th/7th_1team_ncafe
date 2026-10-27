package com.newcafe.backend.entity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

// 좌석 예약 · 예약대기 (seat_reservations). 한 건 = 회원 한 명의 지점 · 날짜 · 시간대 하나
// 취소해도 행은 남기고(status = CANCELED) 잡고 있던 의자(chairs)만 지운다
@Entity
@Table(name = "seat_reservations", indexes = {
        @Index(columnList = "branch_id, reservation_date, start_time"),
        @Index(columnList = "member_no, status") })
@Data
@NoArgsConstructor
public class SeatReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Member member;                // member_no BIGINT (FK → members.no)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Branch branch;                // branch_id VARCHAR(255) (FK → branches.id)

    @Column(name = "reservation_date", nullable = false)
    private LocalDate date;               // reservation_date DATE (KST)

    @Column(nullable = false)
    private LocalTime startTime;          // start_time TIME ("13:00")

    @Column(nullable = false)
    private LocalTime endTime;            // end_time TIME ("14:00")

    @Column(nullable = false)
    private int people;                   // people INT (인원, 1~8)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Kind kind;                    // kind VARCHAR(20) (예약 / 예약대기)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE; // status VARCHAR(20)

    @Column(nullable = false, updatable = false)
    private OffsetDateTime reservedAt;    // reserved_at TIMESTAMPTZ (신청 시각)

    private OffsetDateTime canceledAt;    // canceled_at TIMESTAMPTZ

    // 예약대기만: 같은 시간대 예약이 취소돼 인원만큼 자리가 났을 때 기록한다 (마이페이지 "자리가 났어요")
    private OffsetDateTime notifiedAt;    // notified_at TIMESTAMPTZ

    // 잡은 의자 (reserved_chairs). 예약대기는 비어 있다. 취소 시 비우면 orphanRemoval로 행이 지워져 자리가 풀린다
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ReservedChair> chairs = new ArrayList<>();

    public enum Kind {
        RESERVED, // 의자를 잡은 예약
        WAITING   // 자리가 없을 때 예약대기
    }

    public enum Status {
        ACTIVE,     // 유효 (예약됨 · 대기 중)
        CHECKED_IN, // 방문 확인
        CANCELED,   // 취소 (예약대기는 같은 시간대를 예약하면 자동으로 취소된다)
        NO_SHOW     // 오지 않음
    }

    // 의자를 붙일 때는 이 메서드로 — 중복 예약 검사용 날짜 · 시각을 예약과 같게 맞춘다
    public void addChair(Seat seat, int chairNo) {
        ReservedChair chair = new ReservedChair();
        chair.setReservation(this);
        chair.setSeat(seat);
        chair.setChairNo(chairNo);
        chair.setDate(date);
        chair.setStartTime(startTime);
        chairs.add(chair);
    }

    // 응답용 의자 순서 — 좌석 코드 → 의자 번호 순
    public List<ReservedChair> chairsInOrder() {
        return chairs.stream()
                .sorted(Comparator.comparing((ReservedChair c) -> c.getSeat().getCode())
                        .thenComparingInt(ReservedChair::getChairNo))
                .toList();
    }

    @PrePersist
    void prePersist() {
        if (reservedAt == null) {
            reservedAt = OffsetDateTime.now();
        }
    }
}
