package com.newcafe.backend.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.newcafe.backend.dto.branch.BranchResponse;
import com.newcafe.backend.service.BranchService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    @GetMapping
    public List<BranchResponse> findAll() {
        return branchService.findAll();
    }

    @GetMapping("/{id}")
    public BranchResponse findById(@PathVariable String id) {
        return branchService.findById(id);
    }
}
