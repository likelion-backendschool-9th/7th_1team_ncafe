package com.newcafe.backend.repository;

import com.newcafe.backend.entity.*;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface BranchAdminRepository extends JpaRepository<BranchAdmin, BranchAdminId> {
    @EntityGraph(attributePaths = {"branch", "member"})
    List<BranchAdmin> findByBranchIdOrderByMemberNoAsc(String branchId);

    @EntityGraph(attributePaths = {"branch", "member"})
    List<BranchAdmin> findByMemberNoOrderByBranchIdAsc(Long memberNo);
}
