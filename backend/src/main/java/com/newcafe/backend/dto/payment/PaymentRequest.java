package com.newcafe.backend.dto.payment;

// 결제 승인 요청 — 토스 결제 성공 페이지(successUrl)의 쿼리 값을 그대로 보낸다.
// 서버는 orderId · amount가 이 주문의 pg_order_id · 합계와 같은지 확인한 뒤 토스에 승인을 요청한다
public record PaymentRequest(
        String paymentKey,
        String orderId,   // 토스 orderId (= 결제 응답의 pgOrderId), 주문번호(id)가 아니다
        Integer amount) {
}
