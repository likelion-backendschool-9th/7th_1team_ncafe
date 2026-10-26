package com.newcafe.backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.common.exception.ForbiddenException;
import com.newcafe.backend.dto.member.MemberResponse;
import com.newcafe.backend.dto.member.MemberUpdateRequest;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.MemberService;

import lombok.RequiredArgsConstructor;

// 마이페이지 회원정보 API. memberId는 회원 관리번호(no)이며 로그인한 본인만 사용할 수 있다.
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // GET /api/v1/me/{memberId}
    @GetMapping("/{memberId}")
    public MemberResponse findByNo(@PathVariable Long memberId, Authentication authentication) {
        checkOwner(memberId, authentication);
        return memberService.findByNo(memberId);
    }

    // PATCH /api/v1/me/{memberId}
    @PatchMapping("/{memberId}")
    public MemberResponse update(@PathVariable Long memberId,
                                 @RequestBody MemberUpdateRequest request,
                                 Authentication authentication) {
        checkOwner(memberId, authentication);
        return memberService.update(memberId, request);
    }

    private void checkOwner(Long memberId, Authentication authentication) {
        if (!memberId.equals(AuthService.loginMemberNo(authentication))) {
            throw new ForbiddenException("MEMBER_FORBIDDEN", "본인 회원정보만 조회·수정할 수 있습니다.");
        }
    }
}
