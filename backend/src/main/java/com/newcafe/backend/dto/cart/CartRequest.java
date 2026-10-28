package com.newcafe.backend.dto.cart;

// 장바구니 담기 · 수량 변경 · 로그인 시 합치기 요청 (프론트 CartLine).
// size가 null이면 사이즈 없는 메뉴(디저트)로 보고 메뉴의 가장 싼 사이즈로 담는다
public record CartRequest(
        Long menuId,
        String size,       // "S" · "M" · "L" · "XL", 디저트는 null
        Integer quantity) { // 담기: 더할 수량, 수량 변경: 바꿀 수량 (1~20)
}
