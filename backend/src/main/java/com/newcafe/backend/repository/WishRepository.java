package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Wish;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WishRepository extends JpaRepository<Wish, Wish.Key> {
    // 내 찜 목록 (삭제되지 않은 메뉴만, 최근 찜한 순)
    @Query("""
            select w.menu.id from Wish w
             where w.member.no = :memberNo and w.menu.deleted = false
             order by w.createdDate desc
            """)
    List<Long> findMenuIdsByMemberNo(@Param("memberNo") Long memberNo);

    boolean existsByMemberNoAndMenuId(Long memberNo, Long menuId);

    // 찜 해제. 없던 찜이면 0을 돌려준다.
    @Modifying
    @Query("delete from Wish w where w.member.no = :memberNo and w.menu.id = :menuId")
    int deleteByMemberNoAndMenuId(@Param("memberNo") Long memberNo, @Param("menuId") Long menuId);
}
