package com.newcafe.backend.dto.member.admin;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.newcafe.backend.entity.Member;

// 관리자 회원 목록·상세 응답
public record MemberResponse(
        Long no,
        String loginId,
        Integer gradeId,
        String role,
        String nickname,
        LocalDate birth,
        String gender,
        String phoneNumber,
        String email,
        String postcode,
        String address1,
        String address2,
        int couponCount,
        int totalEarnedCoupons, // 지금까지 받은 쿠폰 수 (등급 기준)
        int loseStreak,
        OffsetDateTime joinDate) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getNo(),
                member.getLoginId(),
                member.getGrade() == null ? null : member.getGrade().getId(),
                member.getRole().name(),
                member.getNickname(),
                member.getBirth(),
                member.getGender(),
                member.getPhoneNumber(),
                member.getEmail(),
                member.getPostcode(),
                member.getAddress1(),
                member.getAddress2(),
                member.getCouponCount(),
                member.getTotalEarnedCoupons(),
                member.getLoseStreak(),
                member.getJoinDate());
    }
}
