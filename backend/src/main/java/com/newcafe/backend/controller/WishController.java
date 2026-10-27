package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.WishService;

import lombok.RequiredArgsConstructor;

// 내 찜 API (로그인 필요). 프론트에서는 "찜한 메뉴(favorites)"라 부른다.
@RestController
@RequestMapping("/api/v1/me/favorites")
@RequiredArgsConstructor
public class WishController {

    private final WishService wishService;

    // GET /api/v1/me/favorites → 찜한 메뉴 id 목록 (최근 찜한 순)
    @GetMapping
    public List<Long> findAll(Authentication authentication) {
        return wishService.findMenuIds(AuthService.loginMemberNo(authentication));
    }

    // PUT /api/v1/me/favorites/{menuId} → 찜 (이미 찜했어도 204)
    @PutMapping("/{menuId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(@PathVariable Long menuId, Authentication authentication) {
        wishService.add(AuthService.loginMemberNo(authentication), menuId);
    }

    // DELETE /api/v1/me/favorites/{menuId} → 찜 해제 (없던 찜이어도 204)
    @DeleteMapping("/{menuId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long menuId, Authentication authentication) {
        wishService.remove(AuthService.loginMemberNo(authentication), menuId);
    }
}
