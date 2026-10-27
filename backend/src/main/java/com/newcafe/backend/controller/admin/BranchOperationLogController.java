package com.newcafe.backend.controller.admin;

import java.util.List;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.BranchOperationLogService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class BranchOperationLogController {
    private final BranchOperationLogService logs;

    @GetMapping("/api/v1/admin/branches/{branchId}/operation-logs")
    public List<BranchOperationLogService.Response> findRecent(@PathVariable String branchId, Authentication auth) {
        return logs.findRecent(AuthService.loginMemberNo(auth), branchId);
    }
}
