package com.newcafe.backend.entity;

import java.io.Serializable;

import jakarta.persistence.*;
import lombok.*;

// 지점별 판매가능여부 (menus_available): 복합키(branch_id, menu_id) + 상태
// 지점(branches) 엔티티가 생기기 전까지 branch_id는 값(지점 코드)으로만 들고 있는다.
@Entity
@Table(name = "menus_available")
@IdClass(MenuAvailability.Key.class)
@Data
@NoArgsConstructor
public class MenuAvailability {

    @Id
    @Column(name = "branch_id", length = 255)
    private String branchId;              // branch_id VARCHAR(255) (PK, FK → branches.id)

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

    // 복합키 (@IdClass). 필드명은 위 @Id 필드와 같아야 하고, menu는 Menu의 id 타입으로 둔다.
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private String branchId;
        private Long menu;
    }
}
