package com.newcafe.backend.dto.branch.admin;

// sort(손님 화면 지점 순서)는 선택 — 없으면 0.
public record BranchCreateRequest(String id, String name, String address,
        String sections, String fixtures, Boolean open, Integer sort) {
}
