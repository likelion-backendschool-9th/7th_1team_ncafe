package com.newcafe.backend.repository;

import com.newcafe.backend.entity.BranchOperationLog;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchOperationLogRepository extends JpaRepository<BranchOperationLog, Long> {
    List<BranchOperationLog> findByBranchIdOrderByOccurredAtDescIdDesc(String branchId, Pageable pageable);
}
