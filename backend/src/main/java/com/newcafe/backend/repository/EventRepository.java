package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Event;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

// 기본 CRUD는 JpaRepository가 제공한다.
//   상세 조회: findById(id)
//   등록·수정: save(event)
//   삭제: delete(event)  (참여 기록이 없는 이벤트만 — service.admin.EventService)
public interface EventRepository extends JpaRepository<Event, Long> {
    // 이벤트 목록, 최신 등록순
    List<Event> findAllByOrderByIdDesc();

    // 지점의 이벤트 목록, 최신 등록순
    List<Event> findAllByBranchIdOrderByIdDesc(String branchId);

    // 참여할 때 이벤트 행을 잠근다 — 선착순 인원(capacity)을 동시에 넘지 않게 참여 수 확인 · 저장을 차례로 한다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Event> findWithLockById(Long id);
}
