package com.newcafe.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.menu.MenuResponse;
import com.newcafe.backend.repository.MenuRepository;

import lombok.RequiredArgsConstructor;

// 사용자용 메뉴 조회 (등록·수정·삭제는 service.admin.MenuService)
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private final MenuRepository menuRepository;

    // 메뉴 목록 조회
    public List<MenuResponse> findAll() {
        return menuRepository.findAllByDeletedFalseOrderByIdAsc().stream()
                .map(MenuResponse::from)
                .toList();
    }

    // 메뉴 상세 조회
    public MenuResponse findById(Long id) {
        return menuRepository.findByIdAndDeletedFalse(id)
                .map(MenuResponse::from)
                .orElseThrow(() -> new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + id));
    }
}
