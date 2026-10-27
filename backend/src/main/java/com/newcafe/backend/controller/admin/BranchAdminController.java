package com.newcafe.backend.controller.admin;

import com.newcafe.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/branches/{branchId}/admins")
@RequiredArgsConstructor
public class BranchAdminController {
    private final BranchAdminService service;

    @GetMapping
    public List<BranchAdminService.Assignment> list(@PathVariable String branchId, Authentication auth) {
        return service.findAdmins(AuthService.loginMemberNo(auth), branchId);
    }

    @PutMapping("/{memberNo}")
    public BranchAdminService.Assignment assign(@PathVariable String branchId, @PathVariable Long memberNo, Authentication auth) {
        return service.assign(AuthService.loginMemberNo(auth), branchId, memberNo);
    }

    @DeleteMapping("/{memberNo}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable String branchId, @PathVariable Long memberNo, Authentication auth) {
        service.revoke(AuthService.loginMemberNo(auth), branchId, memberNo);
    }
}
