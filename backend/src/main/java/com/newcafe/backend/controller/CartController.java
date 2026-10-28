package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.cart.CartRequest;
import com.newcafe.backend.dto.cart.CartResponse;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.CartService;

import lombok.RequiredArgsConstructor;

// 내 장바구니 API (로그인 필요). 한 줄은 메뉴 id + 사이즈로 가리킨다(디저트는 사이즈 생략)
@RestController
@RequestMapping("/api/v1/me/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // GET /api/v1/me/cart → 내 장바구니 (담은 순서)
    @GetMapping
    public List<CartResponse> findAll(Authentication authentication) {
        return cartService.findMine(AuthService.loginMemberNo(authentication));
    }

    // POST /api/v1/me/cart → 담기 (이미 담은 줄이면 수량을 더한다)
    @PostMapping
    public CartResponse add(@RequestBody CartRequest request, Authentication authentication) {
        return cartService.add(AuthService.loginMemberNo(authentication), request);
    }

    // PUT /api/v1/me/cart → 수량 변경
    @PutMapping
    public CartResponse update(@RequestBody CartRequest request, Authentication authentication) {
        return cartService.update(AuthService.loginMemberNo(authentication), request);
    }

    // POST /api/v1/me/cart/merge → 로그인 시 비로그인 장바구니 합치기 (합친 뒤 장바구니 전체)
    @PostMapping("/merge")
    public List<CartResponse> merge(@RequestBody List<CartRequest> requests, Authentication authentication) {
        return cartService.merge(AuthService.loginMemberNo(authentication), requests);
    }

    // DELETE /api/v1/me/cart/{menuId}?size=M → 한 줄 삭제 (없던 줄이어도 204)
    @DeleteMapping("/{menuId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long menuId, @RequestParam(required = false) String size,
                       Authentication authentication) {
        cartService.remove(AuthService.loginMemberNo(authentication), menuId, size);
    }

    // DELETE /api/v1/me/cart → 전체 비우기
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(Authentication authentication) {
        cartService.clear(AuthService.loginMemberNo(authentication));
    }
}
