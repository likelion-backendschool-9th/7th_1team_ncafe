package com.newcafe.backend.entity;

import java.io.Serializable;

import jakarta.persistence.*;
import lombok.*;

// 지점별 판매가능여부 (menus_available): 복합키(branch_id, menu_id) + 상태
@Entity
@Table(name = "menus_available")
@IdClass(MenuAvailability.Key.class)
@Data
@NoArgsConstructor
public class MenuAvailability {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Branch branch;                // branch_id VARCHAR(255) (PK, FK → branches.id)

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Menu menu;                    // menu_id INT (PK, FK → menus.id)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SaleStatus status = SaleStatus.ON_SALE; // status VARCHAR(20) (판매가능여부)

    public enum SaleStatus {
        ON_SALE,   // 판매 중
        SOLD_OUT,  // 품절
        HIDDEN     // 숨김 (이 지점 메뉴판에서 안 보임)
    }

    // 복합키 (@IdClass). 필드명은 위 @Id 필드와 같아야 하고, 각 타입은 연결된 엔티티의 id 타입(Branch: String, Menu: Long)으로 둔다.
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private String branch;
        private Long menu;
    }
}
