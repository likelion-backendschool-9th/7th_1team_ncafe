package com.newcafe.backend.dto.order;

import java.time.OffsetDateTime;
import java.util.List;

import com.newcafe.backend.dto.payment.PaymentResponse;
import com.newcafe.backend.entity.Order;

// 주문 응답 (내 주문 목록 · 상세 · 주문 직후). id가 주문번호(프론트 ORDER No.0001)
public record OrderResponse(
        Long id,
        String branchId,
        String branchName,
        int totalPrice,
        int totalQuantity,
        String summary,      // "아메리카노 외 2건"
        OffsetDateTime createdDate,
        PaymentResponse payment,
        List<OrderItemResponse> items) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getBranch().getId(),
                order.getBranch().getName(),
                order.getTotalPrice(),
                order.totalQuantity(),
                order.summary(),
                order.getCreatedDate(),
                PaymentResponse.from(order.getPayment()),
                order.getItems().stream().map(OrderItemResponse::from).toList());
    }
}
