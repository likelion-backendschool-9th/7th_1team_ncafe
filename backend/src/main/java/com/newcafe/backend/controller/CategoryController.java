package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.category.CategoryResponse;
import com.newcafe.backend.service.CategoryService;

import lombok.RequiredArgsConstructor;

// 사용자용 카테고리 조회 API (메뉴판 탭). GET /api/v1/menus/** 는 로그인 없이 열려 있다.
@RestController
@RequestMapping("/api/v1/menus/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // GET /api/v1/menus/categories
    @GetMapping
    public List<CategoryResponse> findAll() {
        return categoryService.findAll();
    }
}
