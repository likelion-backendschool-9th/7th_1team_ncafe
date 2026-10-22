package com.newcafe.backend.controller.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.member.MemberCreateRequest;
import com.newcafe.backend.dto.member.MemberUpdateRequest;
import com.newcafe.backend.dto.member.admin.MemberResponse;
import com.newcafe.backend.service.admin.MemberService;

import lombok.RequiredArgsConstructor;

// 관리자용 회원 관리 API. id는 회원 관리번호(no)
// 사용자용 controller.MemberController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminMemberController")
@RequestMapping("/api/v1/admin/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // GET /api/v1/admin/members
    @GetMapping
    public List<MemberResponse> findAll() {
        return memberService.findAll();
    }

    // GET /api/v1/admin/members/{id}
    @GetMapping("/{id}")
    public MemberResponse findByNo(@PathVariable Long id) {
        return memberService.findByNo(id);
    }

    // POST /api/v1/admin/members/create
    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse create(@RequestBody MemberCreateRequest request) {
        return memberService.create(request);
    }

    // PATCH /api/v1/admin/members/{id}
    @PatchMapping("/{id}")
    public MemberResponse update(@PathVariable Long id, @RequestBody MemberUpdateRequest request) {
        return memberService.update(id, request);
    }

    // DELETE /api/v1/admin/members/{id} (논리 삭제)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        memberService.delete(id);
    }
}
