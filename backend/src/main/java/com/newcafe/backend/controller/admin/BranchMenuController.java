package com.newcafe.backend.controller.admin;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.menu.admin.BranchMenuResponse;
import com.newcafe.backend.dto.menu.admin.BranchMenuStatusRequest;
import com.newcafe.backend.service.admin.BranchMenuService;

import lombok.RequiredArgsConstructor;

// 관리자용 지점별 메뉴 판매 상태 API. 메뉴 등록·수정·삭제는 본사 공통(/api/v1/admin/menus).
@RestController
@RequestMapping("/api/v1/admin/branches/{branchId}/menus")
@RequiredArgsConstructor
public class BranchMenuController {

    private final BranchMenuService branchMenuService;
    private final com.newcafe.backend.service.BranchAdminService branchAccess;

    // GET /api/v1/admin/branches/{branchId}/menus
    @GetMapping
    public List<BranchMenuResponse> findAll(@PathVariable String branchId, org.springframework.security.core.Authentication auth) {
        branchAccess.requireAccess(com.newcafe.backend.service.AuthService.loginMemberNo(auth), branchId);
        return branchMenuService.findAll(branchId);
    }

    // PATCH /api/v1/admin/branches/{branchId}/menus/{menuId}/status
    @PatchMapping("/{menuId}/status")
    public BranchMenuResponse updateStatus(@PathVariable String branchId,
                                           @PathVariable Long menuId,
                                           @RequestBody BranchMenuStatusRequest request, org.springframework.security.core.Authentication auth) {
        branchAccess.requireAccess(com.newcafe.backend.service.AuthService.loginMemberNo(auth), branchId);
        return branchMenuService.updateStatus(branchId, menuId, request, com.newcafe.backend.service.AuthService.loginMemberNo(auth));
    }
}
