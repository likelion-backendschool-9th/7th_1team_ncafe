package com.newcafe.backend.entity;

import java.io.Serializable;
import java.time.OffsetDateTime;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.*;
import lombok.*;

// 장바구니 한 줄 (cart): 복합키(member_no, menu_size_id) + 수량. 같은 메뉴라도 사이즈가 다르면 다른 줄이다.
// ERD의 menu_id는 menu_size_id가 이미 메뉴를 가리켜 뺐다(메뉴는 menuSize.menu). 가격은 담아 두지 않고 볼 때마다 지금 사이즈 가격을 쓴다.
@Entity
@Table(name = "cart")
@IdClass(Cart.Key.class)
@Data
@NoArgsConstructor
public class Cart {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Member member;                // member_no BIGINT (PK, FK → members.no)

    // 관리자가 메뉴에서 사이즈를 빼면(menus_size 행 삭제) 그 사이즈를 담은 줄도 DB가 함께 지운다
    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_size_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private MenuSize menuSize;            // menu_size_id BIGINT (PK, FK → menus_size.id)

    @Column(nullable = false)
    private int quantity;                 // quantity INT (1~20)

    // 장바구니를 담은 순서대로 보여 주려고 둔다 (ERD에 추가)
    @Column(name = "created_date", nullable = false, updatable = false)
    private OffsetDateTime createdDate;   // created_date TIMESTAMPTZ (처음 담은 시각)

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = OffsetDateTime.now();
        }
    }

    // 복합키 (@IdClass). 필드명은 위 @Id 필드와 같고, 각 타입은 연결된 엔티티의 id 타입(Member.no, MenuSize.id)이다.
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private Long member;
        private Long menuSize;
    }
}
