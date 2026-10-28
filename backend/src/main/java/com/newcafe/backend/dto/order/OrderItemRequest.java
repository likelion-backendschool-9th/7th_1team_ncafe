package com.newcafe.backend.dto.order;

// 주문 요청의 한 줄 (프론트 CartLine). size가 null이면 사이즈 없는 메뉴(디저트)로 보고 메뉴의 가장 싼 사이즈로 담는다
public record OrderItemRequest(
        Long menuId,
        String size,       // "S" · "M" · "L" · "XL", 디저트는 null
        Integer quantity) { // 1~20
}
