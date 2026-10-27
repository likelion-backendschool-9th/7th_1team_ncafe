package com.newcafe.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.newcafe.backend.entity.Branch;

public interface BranchRepository extends JpaRepository<Branch, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select b from Branch b where b.id = :id")
    java.util.Optional<Branch> findForOperations(@org.springframework.data.repository.query.Param("id") String id);
}
