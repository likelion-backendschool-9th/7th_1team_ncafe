package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Order;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

// 기본 CRUD는 JpaRepository가 제공한다.
//   주문: save(order)  (항목은 order.items, 결제 대기는 order.payment에 담아 함께 저장)
public interface OrderRepository extends JpaRepository<Order, Long> {
    // 내 주문 목록, 최신순 (지점 · 결제 · 항목 · 메뉴 포함)
    @EntityGraph(attributePaths = { "branch", "payment", "items", "items.menu" })
    List<Order> findAllByMemberNoOrderByCreatedDateDescIdDesc(Long memberNo);

    // 주문 하나 (지점 · 결제 · 항목 · 메뉴 포함)
    @EntityGraph(attributePaths = { "branch", "payment", "items", "items.menu" })
    Optional<Order> findWithItemsById(Long id);
}
