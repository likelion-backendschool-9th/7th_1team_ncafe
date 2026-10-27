package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Category;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Integer> {
    // 관리자 카테고리 목록 (숨김 포함, 노출 순서대로)
    List<Category> findAllByOrderBySortOrderAsc();

    // 메뉴판 탭 (노출하는 카테고리만, 노출 순서대로)
    List<Category> findAllByVisibleTrueOrderBySortOrderAsc();

    // 노출 순서가 가장 뒤인 카테고리 (새 카테고리를 맨 뒤에 붙일 때 사용)
    Optional<Category> findTopByOrderBySortOrderDesc();
}
