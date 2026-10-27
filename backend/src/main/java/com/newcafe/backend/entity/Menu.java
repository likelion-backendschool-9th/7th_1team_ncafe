package com.newcafe.backend.entity;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.*;
import lombok.*; // 롬복을 설치 한 사람만 사용할 것

@Entity
@Table(name = "menus")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nameKor;

    @Column(nullable = false)
    private String nameEng;

    // 카테고리 (category_id INT, FK → categories.id)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Category category;

    private String description;
    private String image;

    @Column(length = 10)
    private String label;                 // label VARCHAR(10) (배지: BEST / WINNER / NEW)

    // 논리 삭제 플래그 (true면 목록/상세에서 숨김)
    @Column(nullable = false)
    private boolean deleted = false;

    // 사이즈별 가격 (menus_size)
    @OneToMany(mappedBy = "menu", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<MenuSize> sizes = new ArrayList<>();

    // 해금 등급 (required_grade_id, FK → grade.id). 비어 있으면 누구나 주문할 수 있다.
    // 값이 있으면 그 등급의 필요 누적 쿠폰 이상인 회원만 주문할 수 있다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "required_grade_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Grade requiredGrade;

    // 지점별 판매가능여부는 MenuAvailability (menus_available)

    // 고른 사이즈 (주문 · 장바구니). 사이즈를 고르지 않았으면(디저트) 가장 싼 사이즈 — 메뉴판이 사이즈 없는 메뉴에 보여 주는 가격과 같다
    public Optional<MenuSize> sizeOf(String size) {
        if (size == null || size.isBlank()) {
            return sizes.stream().min(Comparator.comparing(MenuSize::getPrice));
        }
        return sizes.stream()
                .filter(s -> s.getSize().trim().equalsIgnoreCase(size.trim()))
                .findFirst();
    }

    // 이 등급의 회원에게 잠긴 메뉴인가 (주문 · 장바구니). 프론트 lockOf와 같은 규칙 —
    // 해금 등급의 필요 누적 쿠폰이 회원 등급의 필요 누적 쿠폰보다 크면 잠김. 등급이 없는 회원은 0(가장 낮은 등급)으로 본다
    public boolean isLockedFor(Grade memberGrade) {
        int mine = memberGrade == null ? 0 : memberGrade.getMinTotalCoupons();
        return requiredGrade != null && requiredGrade.getMinTotalCoupons() > mine;
    }
}
