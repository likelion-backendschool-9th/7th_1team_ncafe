package com.newcafe.backend.entity;

import java.io.Serializable;
import java.time.OffsetDateTime;

import jakarta.persistence.*;
import lombok.*;

// 찜 (wishes): 복합키(member_no, menu_id). 메뉴 단위로 찜한다(사이즈는 고르지 않는다).
@Entity
@Table(name = "wishes")
@IdClass(Wish.Key.class)
@Data
@NoArgsConstructor
public class Wish {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Member member;                // member_no BIGINT (PK, FK → members.no)

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Menu menu;                    // menu_id (PK, FK → menus.id)

    // 마이페이지 찜 목록을 최근 찜한 순으로 보여 주려고 둔다
    @Column(name = "created_date", nullable = false, updatable = false)
    private OffsetDateTime createdDate;   // created_date TIMESTAMPTZ (찜한 시각)

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = OffsetDateTime.now();
        }
    }

    // 복합키 (@IdClass). 필드명은 위 @Id 필드와 같고, 각 타입은 연결된 엔티티의 id 타입(Member.no, Menu.id)이다.
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private Long member;
        private Long menu;
    }
}
