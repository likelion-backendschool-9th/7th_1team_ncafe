package com.newcafe.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.dto.category.CategoryResponse;
import com.newcafe.backend.repository.CategoryRepository;

import lombok.RequiredArgsConstructor;

// 사용자용 카테고리 조회 (추가·수정·삭제는 service.admin.CategoryService)
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;

    // 메뉴판 탭 목록 (노출하는 카테고리만, 노출 순서대로)
    public List<CategoryResponse> findAll() {
        return categoryRepository.findAllByVisibleTrueOrderBySortOrderAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }
}
