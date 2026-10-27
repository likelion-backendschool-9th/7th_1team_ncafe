package com.newcafe.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.auth.LoginRequest;
import com.newcafe.backend.dto.member.MemberCreateRequest;
import com.newcafe.backend.dto.member.MemberResponse;
import com.newcafe.backend.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

// 인증 API (세션 방식). 비밀번호 찾기(find-password)는 추후 구현
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/csrf")
    public org.springframework.security.web.csrf.CsrfToken csrf(
            org.springframework.security.web.csrf.CsrfToken token) {
        return token;
    }

    // POST /api/v1/auth/login
    @PostMapping("/login")
    public MemberResponse login(@RequestBody LoginRequest request,
                                HttpServletRequest httpRequest,
                                HttpServletResponse httpResponse) {
        return authService.login(request, httpRequest, httpResponse);
    }

    // POST /api/v1/auth/signup (회원가입)
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse signup(@RequestBody MemberCreateRequest request) {
        return authService.signup(request);
    }

    // POST /api/v1/auth/logout
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest httpRequest,
                       HttpServletResponse httpResponse,
                       Authentication authentication) {
        authService.logout(httpRequest, httpResponse, authentication);
    }

    // GET /api/v1/auth/me (로그인 사용자 정보)
    @GetMapping("/me")
    public MemberResponse me(Authentication authentication) {
        return authService.me(authentication);
    }
}
