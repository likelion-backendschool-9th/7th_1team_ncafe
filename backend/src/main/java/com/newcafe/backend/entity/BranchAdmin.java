package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branch_admins", indexes = @Index(name = "branch_admins_member_idx", columnList = "member_no"))
@Getter
@NoArgsConstructor
public class BranchAdmin {
    @EmbeddedId
    private BranchAdminId id;

    @MapsId("branchId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @MapsId("memberNo")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_no", nullable = false)
    private Member member;

    public BranchAdmin(Branch branch, Member member) {
        this.id = new BranchAdminId(branch.getId(), member.getNo());
        this.branch = branch;
        this.member = member;
    }
}
