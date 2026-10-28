package com.newcafe.backend.dto.order;

import java.util.List;

// 주문 요청 — 주문할 지점 + 장바구니 줄들. 단가 · 합계는 받지 않고 서버가 메뉴 가격으로 계산한다
public record OrderRequest(
        String branchId,
        List<OrderItemRequest> items) {
}
