package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 주문 항목 (order_items). 주문 한 건에 담긴 메뉴 한 줄 — 같은 메뉴라도 사이즈가 다르면 다른 줄이다.
// 사이즈 · 단가는 주문하는 순간의 값을 복사해 둔다(메뉴 가격이 바뀌어도 주문 내역은 그대로).
// ERD의 VARCHAR id + 복합키(id, order_id, menu_id) 대신 BIGINT id 하나를 PK로 둔다. 저장은 Order.addItem으로
@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 주문 항목 관리번호)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Order order;                  // order_id BIGINT (FK → orders.id)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Menu menu;                    // menu_id (FK → menus.id)

    @Column(nullable = false, length = 2, columnDefinition = "CHAR(2)")
    private String size;                  // size CHAR(2) (주문한 사이즈. 사이즈 없는 메뉴는 F)

    @Column(nullable = false)
    private int quantity;                 // quantity INT (수량)

    @Column(nullable = false)
    private int unitPrice;                // unit_price INT (주문할 때의 그 사이즈 가격)
}
