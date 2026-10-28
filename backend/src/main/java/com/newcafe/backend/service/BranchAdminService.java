package com.newcafe.backend.service;

import com.newcafe.backend.common.exception.*;
import com.newcafe.backend.dto.branch.BranchResponse;
import com.newcafe.backend.entity.*;
import com.newcafe.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchAdminService {
    private final BranchAdminRepository assignments;
    private final BranchRepository branches;
    private final MemberRepository members;

    public record Assignment(String branchId, Long memberNo, String loginId, String nickname) {
        static Assignment from(BranchAdmin assignment) {
            var member = assignment.getMember();
            return new Assignment(assignment.getBranch().getId(), member.getNo(), member.getLoginId(), member.getNickname());
        }
    }

    private Member active(Long no) {
        return members.findByNoAndDeletedFalse(no)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다."));
    }

    private boolean headOffice(Member member) {
        return member.getRole() == Member.Role.ADMIN || member.getRole() == Member.Role.HQ_ADMIN;
    }

    private void requireHeadOffice(Long no) {
        if (!headOffice(active(no))) throw new ForbiddenException("BRANCH_ASSIGNMENT_FORBIDDEN", "지점 관리자 배정은 본사 관리자만 가능합니다.");
    }

    private Branch branch(String id) {
        return branches.findById(id).orElseThrow(() -> new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다."));
    }

    private boolean eligible(Member member) {
        return !member.isDeleted() && member.getRole() == Member.Role.BRANCH_ADMIN;
    }

    public List<Assignment> findAdmins(Long actor, String branchId) {
        requireHeadOffice(actor);
        branch(branchId);
        return assignments.findByBranchIdOrderByMemberNoAsc(branchId).stream()
                .filter(a -> eligible(a.getMember())).map(Assignment::from).toList();
    }

    @Transactional
    public Assignment assign(Long actor, String branchId, Long memberNo) {
        requireHeadOffice(actor);
        var branch = branch(branchId);
        var member = members.findForBranchAssignment(memberNo)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다."));
        if (!eligible(member)) throw new BadRequestException("BRANCH_ADMIN_REQUIRED", "활성 상태의 지점 관리자만 배정할 수 있습니다.");
        var id = new BranchAdminId(branchId, memberNo);
        return Assignment.from(assignments.findById(id).orElseGet(() -> assignments.save(new BranchAdmin(branch, member))));
    }

    @Transactional
    public void revoke(Long actor, String branchId, Long memberNo) {
        requireHeadOffice(actor);
        branch(branchId);
        // 배정과 해제를 동일한 회원 잠금으로 직렬화한다.
        members.findForBranchAssignment(memberNo)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다."));
        assignments.findById(new BranchAdminId(branchId, memberNo)).ifPresent(assignments::delete);
    }

    public List<BranchResponse> findMine(Long memberNo) {
        var member = active(memberNo);
        if (headOffice(member)) return branches.findAllByOrderBySortAscIdAsc().stream()
                .map(BranchResponse::from).toList();
        if (!eligible(member)) throw new ForbiddenException("BRANCH_ADMIN_REQUIRED", "관리자 권한이 필요합니다.");
        return assignments.findByMemberNoOrderByBranchIdAsc(memberNo).stream()
                .map(a -> BranchResponse.from(a.getBranch())).toList();
    }

    /** 지점별 업무 서비스에서 호출하는 공통 검사. 매번 DB를 조회해 해제·권한 변경을 즉시 반영한다. */
    public void requireAccess(Long memberNo, String branchId) {
        var member = active(memberNo);
        if (!headOffice(member) && (!eligible(member) || !assignments.existsById(new BranchAdminId(branchId, memberNo)))) {
            throw new ForbiddenException("BRANCH_ACCESS_DENIED", "담당 지점만 접근할 수 있습니다.");
        }
        branch(branchId);
    }
}
