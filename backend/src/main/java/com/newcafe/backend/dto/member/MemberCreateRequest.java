package com.newcafe.backend.dto.member;

import java.time.LocalDate;

// 회원 생성 요청 (회원가입 · 관리자 회원 추가)
public record MemberCreateRequest(
        String loginId,
        String password,
        String nickname,
        LocalDate birth,
        String gender,
        String phoneNumber,
        String email,
        String postcode,
        String address1,
        String address2) {

    // 아이디·비밀번호를 뺀 프로필 항목 (수정과 같은 규칙으로 검증·반영하기 위해 사용)
    public MemberUpdateRequest profile() {
        return new MemberUpdateRequest(nickname, birth, gender, phoneNumber, email, postcode, address1, address2);
    }
}
