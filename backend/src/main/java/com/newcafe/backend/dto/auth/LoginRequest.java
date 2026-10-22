package com.newcafe.backend.dto.auth;

// 로그인 요청
public record LoginRequest(String loginId, String password) {
}
