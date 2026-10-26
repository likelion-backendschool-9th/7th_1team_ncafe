package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 출전마 (horses). 7마리 고정이며 관리자는 정보만 수정한다 (추가·삭제 없음).
@Entity
@Table(name = "horses")
@Data
@NoArgsConstructor
public class Horse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 말 관리번호)

    @Column(nullable = false, length = 100)
    private String nameKor;               // name_kor VARCHAR(100) (한글 이름)

    @Column(nullable = false, length = 100)
    private String nameEng;               // name_eng VARCHAR(100) (영문 이름, 화면에는 대문자로)

    @Column(nullable = false, length = 7, columnDefinition = "CHAR(7)")
    private String color;                 // color CHAR(7) (대표색 #RRGGBB)

    @Column(length = 50)
    private String colorName;             // color_name VARCHAR(50) (색 이름)

    private String image;                 // image VARCHAR(255) (이미지 경로)
    private String personality;           // personality VARCHAR(255) (성격)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Trait trait;                  // trait VARCHAR(12) (주행 성향)

    private String description;           // description VARCHAR(255) (소개)

    // 주행 성향. 프론트 시뮬레이션(simulation.ts)의 HorseTrait과 같은 값이며 경주 순위 계산에 쓰인다.
    public enum Trait {
        FAST_START, STEADY, LATE_SPURT, WILDCARD, BALANCED
    }
}
