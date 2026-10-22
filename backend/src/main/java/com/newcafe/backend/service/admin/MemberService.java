package com.newcafe.backend.service.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.member.MemberCreateRequest;
import com.newcafe.backend.dto.member.MemberUpdateRequest;
import com.newcafe.backend.dto.member.admin.MemberResponse;
import com.newcafe.backend.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 회원 관리. 사용자용 service.MemberService와 빈 이름이 겹치지 않도록 이름을 지정한다.
// 추가·수정은 service.MemberService에 맡겨 회원가입·마이페이지와 같은 검증 규칙을 쓴다.
@Service("adminMemberService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    // 클래스 이름이 같아 import 대신 전체 이름으로 쓴다.
    private final com.newcafe.backend.service.MemberService memberService;

    // 회원 목록 조회 (탈퇴 회원 제외)
    public List<MemberResponse> findAll() {
        return memberRepository.findAllByDeletedFalseOrderByNoAsc().stream()
                .map(MemberResponse::from)
                .toList();
    }

    // 회원 상세 조회
    public MemberResponse findByNo(Long no) {
        return memberRepository.findByNoAndDeletedFalse(no)
                .map(MemberResponse::from)
                .orElseThrow(() -> notFound(no));
    }

    // 회원 추가
    @Transactional
    public MemberResponse create(MemberCreateRequest request) {
        return MemberResponse.from(memberService.createMember(request));
    }

    // 회원 부분 수정
    @Transactional
    public MemberResponse update(Long no, MemberUpdateRequest request) {
        return MemberResponse.from(memberService.updateMember(no, request));
    }

    // 회원 삭제 (논리 삭제 + 개인정보 마스킹)
    @Transactional
    public void delete(Long no) {
        if (memberRepository.withdrawById(no) == 0) {
            throw notFound(no);
        }
    }

    private NotFoundException notFound(Long no) {
        return new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + no);
    }
}
