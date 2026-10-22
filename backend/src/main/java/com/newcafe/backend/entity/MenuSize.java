package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 메뉴 사이즈 (menus_size): 복합키(size, menu_id) + 가격
@Entity
@Table(name = "menus_size")
@Data
@NoArgsConstructor
public class MenuSize {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_id")
    private Menu menu;                    // menu_id INT (FK)

    @Column(nullable = false)
    private Integer price;                // price INT

    @Column(nullable = false, length = 2, columnDefinition = "CHAR(2)")
    private String size;                  // size CHAR(2), 더 이상 PK 아님
}

