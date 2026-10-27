package com.newcafe.backend.dto.branch.admin;

public record BranchCreateRequest(String id, String name, String address,
        String sections, String fixtures, Boolean open) {
}
