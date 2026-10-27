package com.newcafe.backend.controller.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.category.admin.CategoryOrderRequest;
import com.newcafe.backend.dto.category.admin.CategoryRequest;
import com.newcafe.backend.dto.category.admin.CategoryResponse;
import com.newcafe.backend.service.admin.CategoryService;

import lombok.RequiredArgsConstructor;

// 관리자용 카테고리 관리 API. 사용자용 controller.CategoryController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminCategoryController")
@RequestMapping("/api/v1/admin/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // GET /api/v1/admin/categories
    @GetMapping
    public List<CategoryResponse> findAll() {
        return categoryService.findAll();
    }

    // GET /api/v1/admin/categories/{id}
    @GetMapping("/{id}")
    public CategoryResponse findById(@PathVariable Integer id) {
        return categoryService.findById(id);
    }

    // POST /api/v1/admin/categories
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@RequestBody CategoryRequest request) {
        return categoryService.create(request);
    }

    // PUT /api/v1/admin/categories/order (노출 순서 변경)
    @PutMapping("/order")
    public List<CategoryResponse> reorder(@RequestBody CategoryOrderRequest request) {
        return categoryService.reorder(request);
    }

    // PUT /api/v1/admin/categories/{id}
    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Integer id, @RequestBody CategoryRequest request) {
        return categoryService.update(id, request);
    }

    // DELETE /api/v1/admin/categories/{id} (메뉴가 남아 있으면 409)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        categoryService.delete(id);
    }
}
