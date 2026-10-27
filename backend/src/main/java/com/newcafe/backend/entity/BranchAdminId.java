package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BranchAdminId implements Serializable {
    @Column(name = "branch_id")
    private String branchId;
    @Column(name = "member_no")
    private Long memberNo;
}
