package com.newcafe.backend.dto.cart;

import com.newcafe.backend.entity.Cart;
import com.newcafe.backend.entity.Menu;

// 장바구니 한 줄 (프론트 CartLine). unitPrice는 담을 때가 아니라 지금 그 사이즈 가격이다
public record CartResponse(
        Long menuId,
        String size,
        String nameKor,
        String nameEng,
        String image,
        int unitPrice,
        int quantity) {

    public static CartResponse from(Cart cart) {
        Menu menu = cart.getMenuSize().getMenu();
        return new CartResponse(
                menu.getId(),
                cart.getMenuSize().getSize().trim(),
                menu.getNameKor(),
                menu.getNameEng(),
                menu.getImage(),
                cart.getMenuSize().getPrice(),
                cart.getQuantity());
    }
}
