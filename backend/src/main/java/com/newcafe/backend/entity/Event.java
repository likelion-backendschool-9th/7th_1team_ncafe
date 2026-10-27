package com.newcafe.backend.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 이벤트 (events). 지점(branches) 엔티티가 아직 없어 branch_id는 값만 저장한다.
// 진행 상태는 status(관리자 지정)가 있으면 그 값, 없으면 date_start·date_end로 계산한다(service.EventService.currentStatus).
// 쿠폰 지급 이벤트(coupon = true)는 선착순 이벤트다 — 신청할 때마다 crowded가 1 늘고, capacity(관리자 입력)와 같아지면 신청을 막는다.
// 일반 참여 이벤트(coupon = false)는 crowded · capacity · coupon_amount를 쓰지 않고 신청 인원 제한도 쿠폰 지급도 없다(사용자 결정 2026-10-27).
// 누가 신청했는지는 events_applies에 남겨 중복 신청을 막고 인원 수를 확인한다.
@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 이벤트 번호)

    @Column(nullable = false)
    private String branchId;              // branch_id VARCHAR(255) (지점 관리번호, Branch 엔티티가 생기면 @ManyToOne으로)

    @Column(nullable = false)
    private String title;                 // title VARCHAR(255) (제목)

    private String thumbnail;             // thumbnail VARCHAR(255) (썸네일 이미지 경로)
    private String imageHero;             // image_hero VARCHAR(255) (히어로 섹션 이미지)
    private String imageDetail;           // image_detail VARCHAR(255) (상세페이지 이미지)

    @Column(columnDefinition = "TEXT")
    private String description;           // description TEXT (설명)

    @Column(columnDefinition = "TEXT")
    private String howTo;                 // how_to TEXT (참여방법)

    @Column(columnDefinition = "TEXT")
    private String notes;                 // notes TEXT (유의사항)

    private OffsetDateTime dateStart;     // date_start TIMESTAMPTZ (시작일 00:00 KST, null이면 이미 시작)
    private OffsetDateTime dateEnd;       // date_end TIMESTAMPTZ (종료일 23:59:59 KST, null이면 상시)

    @Column(nullable = false)
    private boolean coupon = false;       // coupon BOOLEAN (쿠폰 지급 = 선착순 이벤트 여부)

    private Integer couponAmount;         // coupon_amount INT (한 명에게 주는 쿠폰 수, coupon이 false면 null)
    private Integer capacity;             // capacity INT (선착순 마감 인원, coupon이 false면 null)
    private Integer crowded;              // crowded INT (선착순 참여 인원 — 0에서 시작해 신청할 때마다 1 증가, coupon이 false면 null)

    @Column(nullable = false)
    private boolean visible = false;      // visible BOOLEAN (노출 여부 — 켜면 진행 중이 아니어도 사용자 목록에 보인다)

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Status status;                // status VARCHAR(20) (ERD에 추가한 칼럼, 관리자 지정 상태. null이면 날짜로 자동)

    // UPCOMING: 예정 / ONGOING: 진행 중 / ENDED: 종료
    public enum Status {
        UPCOMING, ONGOING, ENDED
    }
}
