package com.newcafe.backend.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 이벤트 참여 (events_applies). 회원은 한 이벤트에 한 번만 참여한다.
@Entity
@Table(name = "events_applies",
        uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "member_no"}))
@Data
@NoArgsConstructor
public class EventApply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "apply_id")
    private Long id;                      // apply_id BIGINT (PK, 이벤트 참여 번호)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;                  // event_id BIGINT (FK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    private Member member;                // member_no BIGINT (FK)

    @Column(nullable = false, updatable = false)
    private OffsetDateTime appliedDate;   // applied_date TIMESTAMPTZ (참여일자)

    @PrePersist
    void prePersist() {
        if (appliedDate == null) {
            appliedDate = OffsetDateTime.now();
        }
    }
}
