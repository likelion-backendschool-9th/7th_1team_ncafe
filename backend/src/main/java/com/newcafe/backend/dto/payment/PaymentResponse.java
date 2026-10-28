package com.newcafe.backend.dto.payment;

import java.time.OffsetDateTime;

import com.newcafe.backend.entity.Payment;

// 결제 응답. 결제 대기(READY)면 method · paidDate가 null이다.
// pgOrderId는 결제위젯 requestPayment의 orderId로 넘긴다
public record PaymentResponse(
        Long id,
        Long orderId,
        String pgOrderId,
        Payment.Method method,
        Payment.Status status,
        OffsetDateTime paidDate,
        OffsetDateTime createdDate) {

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getId(),
                payment.getPgOrderId(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getPaidDate(),
                payment.getCreatedDate());
    }
}
