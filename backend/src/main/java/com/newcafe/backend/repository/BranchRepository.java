package com.newcafe.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.newcafe.backend.entity.Branch;

public interface BranchRepository extends JpaRepository<Branch, String> {
}
