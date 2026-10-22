package com.newcafe.backend.dto.menu;

import com.newcafe.backend.entity.MenuSize;

public record MenuSizeResponse(String size, Integer price) {

    public static MenuSizeResponse from(MenuSize menuSize) {
        return new MenuSizeResponse(menuSize.getSize().trim(), menuSize.getPrice());
    }
}
