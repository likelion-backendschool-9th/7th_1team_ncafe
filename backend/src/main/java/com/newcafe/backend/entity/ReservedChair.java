package com.newcafe.backend.entity;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.*;
import lombok.*;

// 예약된 의자 (reserved_chairs). 행이 있으면 그 시간대에 그 의자는 찬 자리
// unique(seat_id, chair_no, reservation_date, start_time)로 동시에 같은 의자를 예약해도 한 건만 들어간다
// seat가 지점에 속하므로 지점은 따로 두지 않는다. 날짜 · 시각은 예약과 같은 값 (SeatReservation.addChair)
@Entity
@Table(name = "reserved_chairs",
        uniqueConstraints = @UniqueConstraint(columnNames = { "seat_id", "chair_no", "reservation_date", "start_time" }))
@Data
@NoArgsConstructor
public class ReservedChair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private SeatReservation reservation;  // reservation_id BIGINT (FK → seat_reservations.id)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Seat seat;                    // seat_id BIGINT (FK → seats.id)

    @Column(nullable = false)
    private int chairNo;                  // chair_no INT (1~seat.capacity)

    @Column(name = "reservation_date", nullable = false)
    private LocalDate date;               // reservation_date DATE

    @Column(nullable = false)
    private LocalTime startTime;          // start_time TIME

    // 의자 id "T03-1"
    public String chairId() {
        return seat.chairId(chairNo);
    }

    // 의자 이름 — 테이블 의자는 "T03 1번", 바석은 자리 이름 그대로 "B07" (프론트 labels.chairLabel과 같은 규칙)
    public String chairLabel() {
        return seat.getType() == Seat.Type.BAR ? seat.getCode() : seat.getCode() + " " + chairNo + "번";
    }
}
