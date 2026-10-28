package com.newcafe.backend.entity;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

// 주문 (orders). 한 건 = 회원 한 명이 한 지점에서 한 번 주문한 것. 담은 메뉴는 order_items, 결제는 payment에 있다.
// ERD에 없는 branch_id를 더했다 — 어느 지점 주문인지가 판매 상태(품절 · 숨김) 확인과 지점별 주문 관리의 기준이다.
// 주문하면 결제 대기(READY) 결제가 함께 만들어지고, 결제는 PaymentService가 완료한다.
@Entity
@Table(name = "orders", indexes = {
        @Index(columnList = "member_no, created_date"),
        @Index(columnList = "branch_id, created_date") })
@Data
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 주문번호)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Member member;                // member_no BIGINT (FK → members.no)

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Branch branch;                // branch_id VARCHAR(255) (FK → branches.id, ERD에 추가)

    @Column(nullable = false)
    private int totalPrice;               // total_price INT (합계 금액 = 항목별 단가 × 수량의 합)

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdDate;   // created_date TIMESTAMPTZ (주문 시각)

    // 주문 항목 (order_items). 주문과 함께 저장된다(cascade)
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<OrderItem> items = new ArrayList<>();

    // 결제 (payment). 주문과 함께 결제 대기로 저장된다(cascade)
    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Payment payment;

    // 항목을 붙일 때는 이 메서드로 — 합계 금액을 함께 맞춘다
    public void addItem(Menu menu, String size, int quantity, int unitPrice) {
        OrderItem item = new OrderItem();
        item.setOrder(this);
        item.setMenu(menu);
        item.setSize(size);
        item.setQuantity(quantity);
        item.setUnitPrice(unitPrice);
        items.add(item);
        totalPrice += unitPrice * quantity;
    }

    // 결제 대기 상태의 결제를 붙인다
    public void preparePayment() {
        Payment ready = new Payment();
        ready.setOrder(this);
        payment = ready;
    }

    // 총 수량 — 아메리카노 M 2개 + 라떼 L 1개 = 3
    public int totalQuantity() {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    // "아메리카노", "아메리카노 외 2건" (프론트 orderSummary와 같은 규칙)
    public String summary() {
        if (items.isEmpty()) {
            return "";
        }
        String first = items.get(0).getMenu().getNameKor();
        int rest = items.size() - 1;
        return rest > 0 ? first + " 외 " + rest + "건" : first;
    }

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = OffsetDateTime.now();
        }
    }
}
