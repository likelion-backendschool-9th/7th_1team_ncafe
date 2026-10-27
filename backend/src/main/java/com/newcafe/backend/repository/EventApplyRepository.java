package com.newcafe.backend.repository;

import com.newcafe.backend.entity.EventApply;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

// 기본 CRUD는 JpaRepository가 제공한다.
//   참여: save(apply)
public interface EventApplyRepository extends JpaRepository<EventApply, Long> {
    // 이 회원이 이 이벤트에 이미 참여했는지 (이벤트당 한 번)
    boolean existsByEventIdAndMemberNo(Long eventId, Long memberNo);

    // 이 이벤트에 참여 기록이 있는지 — 참여 기록이 있는 이벤트는 삭제할 수 없다
    boolean existsByEventId(Long eventId);

    // 이벤트 하나의 참여 수
    long countByEventId(Long eventId);

    // 이벤트별 참여 수 (목록 응답용, 참여가 없는 이벤트는 빠진다)
    @Query("select a.event.id as eventId, count(a) as count from EventApply a group by a.event.id")
    List<ApplyCount> countGroupByEvent();

    // 내 참여 기록, 최신순 (이벤트 포함)
    @EntityGraph(attributePaths = {"event", "member"})
    List<EventApply> findAllByMemberNoOrderByAppliedDateDesc(Long memberNo);

    // 이벤트의 참여자 목록, 참여순 (관리자, 회원 포함)
    @EntityGraph(attributePaths = {"event", "member"})
    List<EventApply> findAllByEventIdOrderByAppliedDateAsc(Long eventId);

    interface ApplyCount {
        Long getEventId();

        long getCount();
    }
}
