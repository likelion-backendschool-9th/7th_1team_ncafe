package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.menu.MenuResponse;
import com.newcafe.backend.service.MenuService;

import lombok.RequiredArgsConstructor;

// 사용자용 메뉴 조회 API
@RestController
@RequestMapping("/api/v1/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    // GET /api/v1/menus?categoryId=&branchId= (둘 다 생략 가능)
    @GetMapping
    public List<MenuResponse> findAll(@RequestParam(required = false) Integer categoryId,
                                      @RequestParam(required = false) String branchId) {
        return menuService.findAll(categoryId, branchId);
    }

    // GET /api/v1/menus/{id}?branchId=
    @GetMapping("/{id}")
    public MenuResponse findById(@PathVariable Long id, @RequestParam(required = false) String branchId) {
        return menuService.findById(id, branchId);
    }
}
