package com.newcafe.backend.controller.admin;

import com.newcafe.backend.dto.branch.BranchResponse;
import com.newcafe.backend.dto.branch.admin.BranchCreateRequest;
import com.newcafe.backend.dto.branch.admin.BranchUpdateRequest;
import com.newcafe.backend.service.admin.BranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController("adminBranchController")
@RequestMapping("/api/v1/admin/branches")
@RequiredArgsConstructor
public class BranchController {
    private final BranchService branchService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BranchResponse create(@RequestBody BranchCreateRequest request) {
        return branchService.create(request);
    }

    @PutMapping("/{id}")
    public BranchResponse update(@PathVariable String id, @RequestBody BranchUpdateRequest request) {
        return branchService.update(id, request);
    }
}
