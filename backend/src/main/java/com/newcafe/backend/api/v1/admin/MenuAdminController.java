package com.newcafe.backend.api.v1.admin;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/menus")
@RequiredArgsConstructor
public class MenuAdminController {
    private final MenuRepository menuRepository;

    @PostMapping
    public Menu createMenu(@RequestBody Menu menu) {
        System.out.println("asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf");
        return menuRepository.save(menu);
    }

    @GetMapping
    public List<Menu> findAllMenus() {
        return menuRepository.findAll();
    }
}
