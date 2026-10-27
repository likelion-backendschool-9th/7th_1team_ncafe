package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Cart;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 기본 CRUD는 JpaRepository가 제공한다.
//   담기: save(cart)  (새 줄)
//   수량 변경: 영속 상태의 cart.quantity를 바꾼다
public interface CartRepository extends JpaRepository<Cart, Cart.Key> {
    // 내 장바구니, 담은 순서 (삭제된 메뉴는 빠진다. 사이즈 · 메뉴 포함)
    @Query("""
            select c from Cart c
              join fetch c.menuSize s
              join fetch s.menu m
             where c.member.no = :memberNo and m.deleted = false
             order by c.createdDate asc, s.id asc
            """)
    List<Cart> findAllByMemberNo(@Param("memberNo") Long memberNo);

    // 장바구니 한 줄
    Optional<Cart> findByMemberNoAndMenuSizeId(Long memberNo, Long menuSizeId);

    // 아래 삭제들은 DB를 직접 지우므로 영속성 컨텍스트를 비워(clear) 같은 트랜잭션에서 지운 줄을 다시 담아도 새 줄로 들어가게 한다.

    // 한 줄 삭제. 없던 줄이면 0을 돌려준다.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Cart c where c.member.no = :memberNo and c.menuSize.id = :menuSizeId")
    int deleteByMemberNoAndMenuSizeId(@Param("memberNo") Long memberNo, @Param("menuSizeId") Long menuSizeId);

    // 여러 줄 삭제 — 결제를 마친 주문의 메뉴 · 사이즈를 장바구니에서 뺀다
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Cart c where c.member.no = :memberNo and c.menuSize.id in :menuSizeIds")
    int deleteByMemberNoAndMenuSizeIdIn(@Param("memberNo") Long memberNo,
                                        @Param("menuSizeIds") Collection<Long> menuSizeIds);

    // 전체 비우기
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Cart c where c.member.no = :memberNo")
    int deleteByMemberNo(@Param("memberNo") Long memberNo);
}
