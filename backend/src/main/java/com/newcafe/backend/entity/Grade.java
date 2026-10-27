package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 등급 정책 확정 전에는 회원의 등급을 지정하지 않는다. */
@Entity
@Table(name = "grade")
@Getter
@Setter
@NoArgsConstructor
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 20)
    private String name;

    @Column(name = "min_total_coupons", nullable = false)
    private int minTotalCoupons;
}
