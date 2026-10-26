package com.newcafe.backend.dto.member;

import java.time.LocalDate;

// 회원 정보 부분 수정 요청 (PATCH: 마이페이지 · 관리자)
//   null인 항목은 그대로 두고, 빈 문자열("")을 보내면 값을 비운다. 닉네임은 비울 수 없다.
public record MemberUpdateRequest(
        String nickname,
        LocalDate birth,
        String gender,
        String phoneNumber,
        String email,
        String postcode,
        String address1,
        String address2) {
}
