package com.newcafe.backend.entity;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.*;

// 결제 (payment). 주문 한 건에 결제 하나 — 주문할 때 결제 대기(READY)로 만들고, 토스페이먼츠 결제 승인이 끝나면 결제 완료(PAID)로 바꾼다.
// pg_order_id(토스 orderId)는 결제 요청 전에 우리가 만들어 위젯에 넘기는 값, pg_transaction_id(토스 paymentKey)는 결제 인증 뒤 토스가 주는 값이다.
@Entity
@Table(name = "payment")
@Data
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                      // id BIGINT (PK, 결제 관리번호)

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Order order;                  // order_id BIGINT (FK → orders.id, 주문당 하나)

    // 서버를 다시 켜도(H2 메모리 DB) 겹치지 않게 무작위 값을 쓴다 — 토스는 한 번 쓴 orderId를 다시 받지 않는다
    @Column(nullable = false, unique = true, length = 64, updatable = false)
    private String pgOrderId;             // pg_order_id VARCHAR(64) (토스 orderId, ERD에 추가)

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Method method;                // method VARCHAR(30) (결제수단, 결제 전 null)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.READY; // status VARCHAR(20)

    private String pgTransactionId;       // pg_transaction_id VARCHAR(255) (토스 paymentKey, 결제 전 null)

    private OffsetDateTime paidDate;      // paid_date TIMESTAMPTZ (결제 완료 시각, 결제 전 null)

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdDate;   // created_date TIMESTAMPTZ (결제 생성 시각 = 주문 시각)

    // 토스 결제 응답의 method 값(한글)과 짝을 맞춘다. 가상계좌는 입금 대기가 생겨 받지 않는다(위젯 관리 화면에서 끈다)
    public enum Method {
        CARD("카드"),
        EASY_PAY("간편결제"),
        TRANSFER("계좌이체"),
        MOBILE_PHONE("휴대폰"),
        CULTURE_GIFT_CERTIFICATE("문화상품권"),
        BOOK_GIFT_CERTIFICATE("도서문화상품권"),
        GAME_GIFT_CERTIFICATE("게임문화상품권");

        private final String tossName;

        Method(String tossName) {
            this.tossName = tossName;
        }

        // 토스 method 값("카드") → Method. 모르는 값이면 empty
        public static Optional<Method> fromToss(String tossName) {
            return Arrays.stream(values()).filter(m -> m.tossName.equals(tossName)).findFirst();
        }
    }

    public enum Status {
        READY, // 결제 대기
        PAID   // 결제 완료
    }

    @PrePersist
    void prePersist() {
        if (pgOrderId == null) {
            pgOrderId = UUID.randomUUID().toString(); // 36자, 영문 · 숫자 · "-"
        }
        if (createdDate == null) {
            createdDate = OffsetDateTime.now();
        }
    }
}
