package com.newcafe.backend.dto.branch.admin;

// PUT은 전체 교체이며 지점 ID와 등록일은 변경하지 않는다.
public record BranchUpdateRequest(String name, String address,
        String sections, String fixtures, Boolean open) {
}
