package com.newcafe.backend.dto.order;

import com.newcafe.backend.entity.OrderItem;

// 주문 항목 한 줄. 이름 · 이미지는 지금 메뉴 값, 사이즈 · 단가는 주문할 때 값이다
public record OrderItemResponse(
        Long id,
        Long menuId,
        String nameKor,
        String nameEng,
        String image,
        String size,
        int quantity,
        int unitPrice) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getMenu().getId(),
                item.getMenu().getNameKor(),
                item.getMenu().getNameEng(),
                item.getMenu().getImage(),
                item.getSize().trim(),
                item.getQuantity(),
                item.getUnitPrice());
    }
}
