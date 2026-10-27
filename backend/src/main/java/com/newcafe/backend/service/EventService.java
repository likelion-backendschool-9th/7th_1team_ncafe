package com.newcafe.backend.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.event.EventApplyResponse;
import com.newcafe.backend.dto.event.EventResponse;
import com.newcafe.backend.entity.Event;
import com.newcafe.backend.entity.EventApply;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.EventApplyRepository;
import com.newcafe.backend.repository.EventRepository;
import com.newcafe.backend.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

// 사용자용 이벤트: 목록·상세 조회, 참여, 내 참여 기록 (등록·수정·삭제는 service.admin.EventService)
// 사용자 목록에는 진행 중인 이벤트와 노출(visible)을 켠 이벤트가 보인다(사용자 결정 2026-10-14 — 진행 중은 늘 보인다).
// 기간은 화면과 API에서 KST 날짜로 주고받고, DB에는 시작일 00:00 · 종료일 23:59:59(KST) 시각으로 둔다(사용자 결정 2026-10-27).
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final LocalTime END_OF_DAY = LocalTime.of(23, 59, 59);

    private final EventRepository eventRepository;
    private final EventApplyRepository applyRepository;
    private final MemberRepository memberRepository;
    private final CouponService couponService;

    // 지금 진행 상태 — 관리자 지정 상태가 있으면 그 값, 없으면 시작일 전 UPCOMING · 종료일 뒤 ENDED · 그 사이 ONGOING.
    // 관리자 이벤트 관리도 같은 규칙을 쓴다
    public static Event.Status currentStatus(Event event, OffsetDateTime now) {
        if (event.getStatus() != null) {
            return event.getStatus();
        }
        if (event.getDateStart() != null && now.isBefore(event.getDateStart())) {
            return Event.Status.UPCOMING;
        }
        if (event.getDateEnd() != null && now.isAfter(event.getDateEnd())) {
            return Event.Status.ENDED;
        }
        return Event.Status.ONGOING;
    }

    // 시작일 → 그날 00:00 KST
    public static OffsetDateTime startOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay(KST).toOffsetDateTime();
    }

    // 종료일 → 그날 23:59:59 KST (종료일 당일까지 진행 중)
    public static OffsetDateTime endOfDay(LocalDate date) {
        return date == null ? null : date.atTime(END_OF_DAY).atZone(KST).toOffsetDateTime();
    }

    // 저장된 시각 → KST 날짜 (응답용)
    public static LocalDate kstDate(OffsetDateTime time) {
        return time == null ? null : time.atZoneSameInstant(KST).toLocalDate();
    }

    // 이벤트별 신청 기록 수 (신청이 없는 이벤트는 빠진다) — 관리자 이벤트 목록도 쓴다
    public static Map<Long, Long> applyCounts(EventApplyRepository applyRepository) {
        return applyRepository.countGroupByEvent().stream()
                .collect(Collectors.toMap(EventApplyRepository.ApplyCount::getEventId, EventApplyRepository.ApplyCount::getCount));
    }

    // 이벤트 목록, 최신 등록순. branchId가 있으면 그 지점의 이벤트만
    public List<EventResponse> findAll(String branchId) {
        OffsetDateTime now = OffsetDateTime.now();
        Map<Long, Long> counts = applyCounts(applyRepository);
        List<Event> events = branchId == null || branchId.isBlank()
                ? eventRepository.findAllByOrderByIdDesc()
                : eventRepository.findAllByBranchIdOrderByIdDesc(branchId.trim());
        return events.stream()
                .filter(event -> isShown(event, now))
                .map(event -> EventResponse.from(event, counts.getOrDefault(event.getId(), 0L)))
                .toList();
    }

    // 이벤트 상세 (숨긴 이벤트는 404)
    public EventResponse findById(Long id) {
        OffsetDateTime now = OffsetDateTime.now();
        Event event = eventRepository.findById(id)
                .filter(e -> isShown(e, now))
                .orElseThrow(() -> notFound(id));
        return EventResponse.from(event, applyRepository.countByEventId(id));
    }

    // 참여 신청: 진행 중 · 중복(events_applies) 확인 → 쿠폰 지급 이벤트면 선착순(crowded < capacity) 확인 후 crowded +1
    // → 신청 기록 저장 → 쿠폰 지급 이벤트면 쿠폰 적립(내역 포함). 일반 참여 이벤트는 인원 제한 · 쿠폰 지급이 없다.
    // 이벤트 행을 잠가 선착순 인원을 동시에 넘지 않게 하고, 쿠폰 적립까지 한 트랜잭션이라 하나라도 실패하면 모두 되돌린다
    @Transactional
    public EventApplyResponse apply(Long memberNo, Long eventId) {
        OffsetDateTime now = OffsetDateTime.now();
        Event event = eventRepository.findWithLockById(eventId)
                .filter(e -> isShown(e, now))
                .orElseThrow(() -> notFound(eventId));

        if (currentStatus(event, now) != Event.Status.ONGOING) {
            throw new ConflictException("EVENT_NOT_ONGOING", "진행 중인 이벤트에만 참여할 수 있습니다.");
        }
        if (applyRepository.existsByEventIdAndMemberNo(eventId, memberNo)) {
            throw new ConflictException("EVENT_ALREADY_APPLIED", "이미 참여한 이벤트입니다.");
        }
        if (event.isCoupon()) {
            int crowded = event.getCrowded() == null ? 0 : event.getCrowded();
            if (event.getCapacity() != null && crowded >= event.getCapacity()) {
                throw new ConflictException("EVENT_FULL", "선착순 인원이 모두 찼습니다.");
            }
            event.setCrowded(crowded + 1);
        }
        Member member = memberRepository.findByNoAndDeletedFalse(memberNo)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + memberNo));

        EventApply apply = new EventApply();
        apply.setEvent(event);
        apply.setMember(member);
        // 쿠폰 적립(CouponService.earn)이 영속성 컨텍스트를 비우므로 crowded · 신청 기록을 먼저 반영하고 응답을 만든다
        EventApplyResponse response = EventApplyResponse.from(applyRepository.saveAndFlush(apply));

        if (event.isCoupon() && event.getCouponAmount() != null && event.getCouponAmount() > 0) {
            // "이벤트 · FIRST GATE 30 참여"
            couponService.earn(memberNo, event.getCouponAmount(), "이벤트 · " + event.getTitle() + " 참여");
        }
        return response;
    }

    // 내 참여 기록 (최신순)
    public List<EventApplyResponse> findMyApplies(Long memberNo) {
        return applyRepository.findAllByMemberNoOrderByAppliedDateDesc(memberNo).stream()
                .map(EventApplyResponse::from)
                .toList();
    }

    // 사용자에게 보이는 이벤트인가 — 진행 중이거나 노출을 켠 이벤트
    private boolean isShown(Event event, OffsetDateTime now) {
        return event.isVisible() || currentStatus(event, now) == Event.Status.ONGOING;
    }

    private NotFoundException notFound(Long id) {
        return new NotFoundException("EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다. id=" + id);
    }
}
