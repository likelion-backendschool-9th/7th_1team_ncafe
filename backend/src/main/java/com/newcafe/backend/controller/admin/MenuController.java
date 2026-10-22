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

import com.newcafe.backend.dto.menu.admin.MenuRequest;
import com.newcafe.backend.dto.menu.admin.MenuResponse;
import com.newcafe.backend.service.admin.MenuService;

import lombok.RequiredArgsConstructor;

// 관리자용 메뉴 관리 API. 사용자용 controller.MenuController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminMenuController")
@RequestMapping("/api/v1/admin/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    // GET /api/v1/admin/menus
    @GetMapping
    public List<MenuResponse> findAll() {
        return menuService.findAll();
    }

    // GET /api/v1/admin/menus/{id}
    @GetMapping("/{id}")
    public MenuResponse findById(@PathVariable Long id) {
        return menuService.findById(id);
    }

    // POST /api/v1/admin/menus
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MenuResponse create(@RequestBody MenuRequest request) {
        return menuService.create(request);
    }

    // PUT /api/v1/admin/menus/{id}
    @PutMapping("/{id}")
    public MenuResponse update(@PathVariable Long id, @RequestBody MenuRequest request) {
        return menuService.update(id, request);
    }

    // DELETE /api/v1/admin/menus/{id} (논리 삭제)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        menuService.delete(id);
    }
}
