package com.newcafe.backend.controller;

import com.newcafe.backend.dto.branch.BranchResponse;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/branch-admin/branches")
@RequiredArgsConstructor
public class ManagedBranchController {
    private final BranchAdminService service;
    private final BranchRepository branches;

    @GetMapping
    public List<BranchResponse> mine(Authentication auth) {
        return service.findMine(AuthService.loginMemberNo(auth));
    }

    @GetMapping("/{branchId}")
    public BranchResponse detail(@PathVariable String branchId, Authentication auth) {
        service.requireAccess(AuthService.loginMemberNo(auth), branchId);
        return BranchResponse.from(branches.findById(branchId).orElseThrow());
    }
}
