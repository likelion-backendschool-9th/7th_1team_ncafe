package com.newcafe.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.entity.Wish;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.MenuRepository;
import com.newcafe.backend.repository.WishRepository;

import lombok.RequiredArgsConstructor;

// 찜 (메뉴 단위). 추가 · 해제는 여러 번 불러도 결과가 같다 — 이미 찜했으면 그대로, 없던 찜을 해제해도 오류가 아니다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishService {

    private final WishRepository wishRepository;
    private final MenuRepository menuRepository;
    private final MemberRepository memberRepository;

    // 내 찜 목록 (메뉴 id, 최근 찜한 순. 삭제된 메뉴는 빠진다)
    public List<Long> findMenuIds(Long memberNo) {
        return wishRepository.findMenuIdsByMemberNo(memberNo);
    }

    // 찜 추가 (없는 메뉴 · 삭제된 메뉴면 404)
    @Transactional
    public void add(Long memberNo, Long menuId) {
        Menu menu = menuRepository.findByIdAndDeletedFalse(menuId)
                .orElseThrow(() -> new NotFoundException("MENU_NOT_FOUND", "메뉴를 찾을 수 없습니다. id=" + menuId));
        if (wishRepository.existsByMemberNoAndMenuId(memberNo, menuId)) {
            return;
        }
        Wish wish = new Wish();
        wish.setMember(memberRepository.getReferenceById(memberNo));
        wish.setMenu(menu);
        wishRepository.save(wish);
    }

    // 찜 해제
    @Transactional
    public void remove(Long memberNo, Long menuId) {
        wishRepository.deleteByMemberNoAndMenuId(memberNo, menuId);
    }
}
