package com.newcafe.backend.entity;

import java.time.OffsetDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "branches")
@Getter
@Setter
@NoArgsConstructor
public class Branch {

    // ERD의 문자열 지점 관리번호. 등록 시 호출자가 지정한다.
    @Id
    @Column(length = 255, nullable = false)
    private String id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(length = 255, nullable = false)
    private String address;

    // 평면도 구조 확정 전에는 JSON 원문을 보관한다.
    // Hibernate의 JSON 타입으로 H2와 PostgreSQL(JSONB)에 매핑한다.
    @JdbcTypeCode(SqlTypes.JSON)
    private String sections;

    @JdbcTypeCode(SqlTypes.JSON)
    private String fixtures;

    @Column(nullable = false)
    private boolean open = false;

    // 손님 화면의 지점 순서 — 작을수록 앞, 같으면 지점 ID 순. 맨 앞 지점이 기본 선택이 된다.
    // 이미 행이 있는 테이블에도 추가할 수 있게 DB 기본값을 0으로 둔다.
    @Column(nullable = false, columnDefinition = "INT DEFAULT 0")
    private int sort = 0;

    @Column(name = "created_date", nullable = false, updatable = false)
    private OffsetDateTime createdDate;

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = OffsetDateTime.now();
        }
    }
}
