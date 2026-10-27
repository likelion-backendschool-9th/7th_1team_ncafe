package com.newcafe.backend.repository;

import com.newcafe.backend.entity.MenuAvailability;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuAvailabilityRepository extends JpaRepository<MenuAvailability, MenuAvailability.Key> {
    // 한 지점의 메뉴별 판매 상태
    List<MenuAvailability> findAllByBranchId(String branchId);

    // 한 지점의 특정 메뉴 판매 상태
    Optional<MenuAvailability> findByBranchIdAndMenuId(String branchId, Long menuId);
}
