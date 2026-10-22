package com.newcafe.backend.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 회원 (members). 등급(grade_id)은 추후 연결
@Entity
@Table(name = "members")
@Data
@NoArgsConstructor
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long no;                      // no BIGINT (PK, 회원 관리번호)

    // 컬럼명은 id지만 PK(no)와 헷갈리지 않도록 필드명은 loginId로 둔다.
    @Column(name = "id", nullable = false, unique = true)
    private String loginId;               // id VARCHAR(255) (회원아이디)

    @Column(nullable = false)
    @ToString.Exclude
    private String password;              // password VARCHAR(255) (BCrypt 해시)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.USER;        // role VARCHAR(20) (USER / ADMIN)

    @Column(nullable = false)
    private String nickname;              // nickname VARCHAR(255)

    private LocalDate birth;              // birth DATE

    @Column(length = 1, columnDefinition = "CHAR(1)")
    private String gender;                // gender CHAR(1), M / F

    @Column(length = 20)
    private String phoneNumber;           // phone_number VARCHAR(20)

    private String email;                 // email VARCHAR(255)
    private String postcode;              // postcode VARCHAR(255)
    private String address1;              // address1 VARCHAR(255) (주소)
    private String address2;              // address2 VARCHAR(255) (상세주소)

    @Column(nullable = false)
    private int couponCount = 0;          // coupon_count INT (보유쿠폰 수)

    @Column(nullable = false)
    private int loseStreak = 0;           // lose_streak INT (현재 연패 수)

    @Column(nullable = false, updatable = false)
    private OffsetDateTime joinDate;      // join_date TIMESTAMPTZ (가입일자)

    // 논리 삭제 플래그 (탈퇴). 주문·베팅 기록이 no를 참조하므로 행은 남긴다.
    @Column(nullable = false)
    private boolean deleted = false;

    // ADMIN만 /api/v1/admin/** 를 사용할 수 있다.
    public enum Role {
        USER, ADMIN
    }

    @PrePersist
    void prePersist() {
        if (joinDate == null) {
            joinDate = OffsetDateTime.now();
        }
    }
}
