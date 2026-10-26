package com.newcafe.backend.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.UnauthorizedException;
import com.newcafe.backend.dto.auth.LoginRequest;
import com.newcafe.backend.dto.member.MemberCreateRequest;
import com.newcafe.backend.dto.member.MemberResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

// 인증 (회원가입 · 세션 로그인 · 로그아웃 · 로그인 사용자 정보). 회원 데이터는 MemberService를 통해 다룬다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final MemberService memberService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    // 회원가입
    @Transactional
    public MemberResponse signup(MemberCreateRequest request) {
        return MemberResponse.from(memberService.createMember(request));
    }

    // 로그인: 아이디·비밀번호를 확인하고 인증 정보를 세션에 저장한다 (응답에 JSESSIONID 쿠키가 실린다).
    public MemberResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (request == null || isBlank(request.loginId()) || isBlank(request.password())) {
            throw new BadRequestException("LOGIN_REQUIRED", "아이디와 비밀번호를 입력해야 합니다.");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.loginId().trim(), request.password()));
        } catch (AuthenticationException e) {
            throw new UnauthorizedException("LOGIN_FAILED", "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        // 세션 고정 공격 방지: 로그인 전 세션이 있으면 세션 ID를 바꾼다.
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return memberService.findByNo(loginMemberNo(authentication));
    }

    // 로그아웃: 세션을 무효화한다.
    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse, Authentication authentication) {
        new SecurityContextLogoutHandler().logout(httpRequest, httpResponse, authentication);
    }

    // 로그인 사용자 정보
    public MemberResponse me(Authentication authentication) {
        return memberService.findByNo(loginMemberNo(authentication));
    }

    // 로그인한 회원의 관리번호 (MemberDetailsService가 username에 no를 넣는다)
    public static Long loginMemberNo(Authentication authentication) {
        return Long.valueOf(authentication.getName());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
