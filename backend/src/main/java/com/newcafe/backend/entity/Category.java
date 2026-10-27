package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 카테고리 (categories). 메뉴판 탭으로 쓰인다.
@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;                   // id INT (PK)

    @Column(nullable = false, length = 50)
    private String nameKor;               // name_kor VARCHAR(50) (한글명)

    @Column(nullable = false, length = 50)
    private String nameEng;               // name_eng VARCHAR(50) (영문명)

    @Column(nullable = false)
    private int sortOrder;                // sort_order INT (탭 노출 순서, 작을수록 앞)

    @Column(nullable = false)
    private boolean visible = true;       // visible BOOLEAN (false면 메뉴판 탭에서 숨김)
}
