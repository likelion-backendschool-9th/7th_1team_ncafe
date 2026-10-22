package com.newcafe.backend.service;

import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.member.MemberCreateRequest;
import com.newcafe.backend.dto.member.MemberResponse;
import com.newcafe.backend.dto.member.MemberUpdateRequest;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

// 회원 생성·조회·수정. 회원가입(AuthService)과 관리자 회원 추가·수정(service.admin.MemberService)도
// createMember / updateMember를 호출해 같은 검증 규칙을 쓴다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    // 영문·숫자·밑줄 4~20자. 탈퇴 회원 아이디('deleted#{no}')와 겹치지 않도록 '#'은 허용하지 않는다.
    private static final Pattern LOGIN_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_]{4,20}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+$");
    private static final int PHONE_NUMBER_MAX_LENGTH = 20;
    // BCrypt는 72바이트까지만 비교하므로 최대 길이를 둔다.
    private static final int PASSWORD_MIN_LENGTH = 8;
    private static final int PASSWORD_MAX_LENGTH = 64;

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    // 회원정보 상세 조회 (마이페이지)
    public MemberResponse findByNo(Long no) {
        return MemberResponse.from(getActiveMember(no));
    }

    // 회원정보 부분 수정 (마이페이지)
    @Transactional
    public MemberResponse update(Long no, MemberUpdateRequest request) {
        return MemberResponse.from(updateMember(no, request));
    }

    // 회원 생성 (회원가입 · 관리자 회원 추가)
    @Transactional
    public Member createMember(MemberCreateRequest request) {
        if (request == null || request.loginId() == null
                || !LOGIN_ID_PATTERN.matcher(request.loginId().trim()).matches()) {
            throw new BadRequestException("MEMBER_ID_INVALID", "회원아이디는 영문·숫자·밑줄 4~20자로 입력해야 합니다.");
        }
        if (request.password() == null || request.password().length() < PASSWORD_MIN_LENGTH
                || request.password().length() > PASSWORD_MAX_LENGTH) {
            throw new BadRequestException("MEMBER_PASSWORD_INVALID",
                    "비밀번호는 " + PASSWORD_MIN_LENGTH + "~" + PASSWORD_MAX_LENGTH + "자로 입력해야 합니다.");
        }
        if (isBlank(request.nickname())) {
            throw new BadRequestException("MEMBER_NICKNAME_REQUIRED", "닉네임은 필수입니다.");
        }
        MemberUpdateRequest profile = request.profile();
        validate(profile);

        String loginId = request.loginId().trim();
        if (memberRepository.existsByLoginId(loginId)) {
            throw new ConflictException("MEMBER_ID_DUPLICATED", "이미 사용 중인 회원아이디입니다: " + loginId);
        }

        Member member = new Member();
        member.setLoginId(loginId);
        member.setPassword(passwordEncoder.encode(request.password()));
        applyProfile(member, profile);

        return memberRepository.save(member);
    }

    // 회원 부분 수정 (마이페이지 · 관리자). 아이디·쿠폰·연패 수는 바꾸지 않는다.
    @Transactional
    public Member updateMember(Long no, MemberUpdateRequest request) {
        validate(request);

        Member member = getActiveMember(no);
        applyProfile(member, request);

        return member;
    }

    private Member getActiveMember(Long no) {
        return memberRepository.findByNoAndDeletedFalse(no)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + no));
    }

    // null인 항목은 그대로 두고, 빈 문자열은 값을 비운다.
    private void applyProfile(Member member, MemberUpdateRequest request) {
        if (request.nickname() != null) {
            member.setNickname(request.nickname().trim());
        }
        if (request.birth() != null) {
            member.setBirth(request.birth());
        }
        if (request.gender() != null) {
            member.setGender(trimToNull(request.gender()));
        }
        if (request.phoneNumber() != null) {
            member.setPhoneNumber(trimToNull(request.phoneNumber()));
        }
        if (request.email() != null) {
            member.setEmail(trimToNull(request.email()));
        }
        if (request.postcode() != null) {
            member.setPostcode(trimToNull(request.postcode()));
        }
        if (request.address1() != null) {
            member.setAddress1(trimToNull(request.address1()));
        }
        if (request.address2() != null) {
            member.setAddress2(trimToNull(request.address2()));
        }
    }

    private void validate(MemberUpdateRequest request) {
        if (request == null) {
            throw new BadRequestException("MEMBER_REQUEST_REQUIRED", "회원 정보가 없습니다.");
        }
        if (request.nickname() != null && request.nickname().isBlank()) {
            throw new BadRequestException("MEMBER_NICKNAME_REQUIRED", "닉네임은 비울 수 없습니다.");
        }
        String gender = trimToNull(request.gender());
        if (gender != null && !gender.equals("M") && !gender.equals("F")) {
            throw new BadRequestException("MEMBER_GENDER_INVALID", "성별은 M 또는 F로 입력해야 합니다.");
        }
        String phoneNumber = trimToNull(request.phoneNumber());
        if (phoneNumber != null && phoneNumber.length() > PHONE_NUMBER_MAX_LENGTH) {
            throw new BadRequestException("MEMBER_PHONE_INVALID",
                    "전화번호는 " + PHONE_NUMBER_MAX_LENGTH + "자 이내로 입력해야 합니다.");
        }
        String email = trimToNull(request.email());
        if (email != null && !EMAIL_PATTERN.matcher(email).matches()) {
            throw new BadRequestException("MEMBER_EMAIL_INVALID", "이메일 형식이 올바르지 않습니다.");
        }
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
