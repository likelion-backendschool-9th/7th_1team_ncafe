package com.newcafe.backend.dto.branch;

import java.time.OffsetDateTime;
import com.newcafe.backend.entity.Branch;

// sections와 fixtures는 현재 엔티티와 동일하게 JSON 원문 문자열로 전달한다.
public record BranchResponse(
        String id, String name, String address,
        String sections, String fixtures, boolean open, OffsetDateTime createdDate) {

    public static BranchResponse from(Branch branch) {
        return new BranchResponse(branch.getId(), branch.getName(), branch.getAddress(),
                branch.getSections(), branch.getFixtures(), branch.isOpen(), branch.getCreatedDate());
    }
}
