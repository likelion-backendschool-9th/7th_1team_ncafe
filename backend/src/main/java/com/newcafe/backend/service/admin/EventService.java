package com.newcafe.backend.service.admin;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.event.EventApplyResponse;
import com.newcafe.backend.dto.event.admin.EventRequest;
import com.newcafe.backend.dto.event.admin.EventResponse;
import com.newcafe.backend.entity.Event;
import com.newcafe.backend.repository.EventApplyRepository;
import com.newcafe.backend.repository.EventRepository;

import lombok.RequiredArgsConstructor;

// 관리자용 이벤트 관리: 등록·수정·삭제, 노출 허가 · 상태 지정, 참여자 목록. 사용자용 service.EventService와 빈 이름이 겹치지 않도록 이름을 지정한다.
// 입력 규칙은 관리자 화면(frontend admin/event/_lib/validateEvent.ts)과 같다. 지점은 지점 엔티티가 생길 때까지 값만 받는다.
// 신청자가 생긴 이벤트는 쿠폰 지급 여부 · 지급 쿠폰 수를 바꿀 수 없고 삭제할 수 없다(사용자 결정 2026-10-27).
@Service("adminEventService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private static final int VARCHAR_MAX_LENGTH = 255; // branch_id · 이미지 경로 VARCHAR(255)
    private static final int TITLE_MAX = 30;
    private static final int DESCRIPTION_MAX = 120;
    private static final int LINES_MAX = 6;            // 참여 방법 · 유의 사항 줄 수
    private static final int LINE_MAX = 80;            // 한 줄 글자 수
    private static final int COUPON_AMOUNT_MAX = 99;   // 한 명에게 주는 쿠폰 수
    private static final int CAPACITY_MAX = 9999;      // 선착순 마감 인원

    private final EventRepository eventRepository;
    private final EventApplyRepository applyRepository;

    // 이벤트 목록 (숨긴 이벤트 포함), 최신 등록순
    public List<EventResponse> findAll() {
        Map<Long, Long> counts = com.newcafe.backend.service.EventService.applyCounts(applyRepository);
        return eventRepository.findAllByOrderByIdDesc().stream()
                .map(event -> EventResponse.from(event, counts.getOrDefault(event.getId(), 0L)))
                .toList();
    }

    // 이벤트 상세
    public EventResponse findById(Long id) {
        return EventResponse.from(getEvent(id), applyRepository.countByEventId(id));
    }

    // 이벤트 등록 — 쿠폰 지급 이벤트는 참여 인원 0명에서 시작한다
    @Transactional
    public EventResponse create(EventRequest request) {
        validate(request, null);

        Event event = new Event();
        apply(event, request);
        event.setCrowded(event.isCoupon() ? 0 : null);

        return EventResponse.from(eventRepository.save(event), 0);
    }

    // 이벤트 수정 (전체 교체). 신청자가 있으면 쿠폰 지급 여부 · 지급 쿠폰 수를 바꿀 수 없고, 선착순 인원을 지금 참여 인원보다 줄일 수 없다
    @Transactional
    public EventResponse update(Long id, EventRequest request) {
        Event event = getEvent(id);
        validate(request, event);

        long applyCount = applyRepository.countByEventId(id);
        boolean coupon = Boolean.TRUE.equals(request.coupon());
        if (hasApplicants(event, applyCount)
                && (coupon != event.isCoupon() || !Objects.equals(couponAmount(request), event.getCouponAmount()))) {
            throw new ConflictException("EVENT_COUPON_LOCKED", "신청자가 있어 쿠폰 지급 여부와 지급 쿠폰 수를 바꿀 수 없습니다.");
        }
        int crowded = event.getCrowded() == null ? 0 : event.getCrowded();
        if (coupon && request.capacity() < crowded) {
            throw new ConflictException("EVENT_CAPACITY_BELOW_APPLIES",
                    "선착순 인원은 지금 참여 인원(" + crowded + "명)보다 적게 줄일 수 없습니다.");
        }
        apply(event, request);
        // 신청자가 없을 때만 종류를 바꿀 수 있으므로, 쿠폰 지급 이벤트가 되면 0명에서 시작한다
        event.setCrowded(coupon ? crowded : null);

        return EventResponse.from(eventRepository.save(event), applyCount);
    }

    // 노출 허가만 바꾼다
    @Transactional
    public EventResponse updateVisible(Long id, EventRequest.Visible request) {
        if (request == null || request.visible() == null) {
            throw new BadRequestException("EVENT_VISIBLE_REQUIRED", "노출 허가 여부가 없습니다.");
        }
        Event event = getEvent(id);
        event.setVisible(request.visible());
        return EventResponse.from(event, applyRepository.countByEventId(id));
    }

    // 상태 직접 지정만 바꾼다 (null · 빈 값이면 날짜로 자동)
    @Transactional
    public EventResponse updateStatus(Long id, EventRequest.Status request) {
        Event event = getEvent(id);
        event.setStatus(parseStatus(request == null ? null : request.status()));
        return EventResponse.from(event, applyRepository.countByEventId(id));
    }

    // 이벤트 삭제 — 신청자가 있으면 409 (신청 기록 · 지급한 쿠폰 내역이 이벤트를 가리키므로 남긴다)
    @Transactional
    public void delete(Long id) {
        Event event = getEvent(id);
        if (hasApplicants(event, applyRepository.countByEventId(id))) {
            throw new ConflictException("EVENT_HAS_APPLIES",
                    "신청자가 있는 이벤트는 삭제할 수 없습니다. 상태를 종료로 지정해 내려 주세요.");
        }
        eventRepository.delete(event);
    }

    // 이벤트 참여자 목록 (참여순) — 중복 신청 · 참여 인원 확인용
    public List<EventApplyResponse> findApplies(Long id) {
        getEvent(id);
        return applyRepository.findAllByEventIdOrderByAppliedDateAsc(id).stream()
                .map(EventApplyResponse::from)
                .toList();
    }

    // 신청자가 있는가 — 신청 기록이 있거나 선착순 참여 인원이 1명 이상
    private boolean hasApplicants(Event event, long applyCount) {
        return applyCount > 0 || (event.getCrowded() != null && event.getCrowded() > 0);
    }

    private Event getEvent(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다. id=" + id));
    }

    // 요청 값을 이벤트에 옮긴다 — 일반 참여 이벤트는 지급 쿠폰 수 · 선착순 인원을 비운다. 참여 인원(crowded)은 여기서 바꾸지 않는다
    private void apply(Event event, EventRequest request) {
        boolean coupon = Boolean.TRUE.equals(request.coupon());
        event.setBranchId(request.branchId().trim());
        event.setTitle(request.title().trim());
        event.setThumbnail(cleanPath(request.thumbnail()));
        event.setImageHero(cleanPath(request.imageHero()));
        event.setImageDetail(cleanPath(request.imageDetail()));
        event.setDescription(request.description().trim());
        event.setHowTo(cleanLines(request.howTo()));
        event.setNotes(cleanLines(request.notes()));
        event.setDateStart(com.newcafe.backend.service.EventService.startOfDay(request.dateStart()));
        event.setDateEnd(com.newcafe.backend.service.EventService.endOfDay(request.dateEnd()));
        event.setCoupon(coupon);
        event.setCouponAmount(couponAmount(request));
        event.setCapacity(coupon ? request.capacity() : null);
        event.setVisible(Boolean.TRUE.equals(request.visible()));
        event.setStatus(parseStatus(request.status()));
    }

    private Integer couponAmount(EventRequest request) {
        return Boolean.TRUE.equals(request.coupon()) ? request.couponAmount() : null;
    }

    // 입력 검사 — editing은 수정 중인 이벤트(등록이면 null)
    private void validate(EventRequest request, Event editing) {
        if (request == null || isBlank(request.branchId())) {
            throw new BadRequestException("EVENT_BRANCH_REQUIRED", "이벤트를 작성한 지점을 골라야 합니다.");
        }
        checkLength(request.branchId().trim(), VARCHAR_MAX_LENGTH, "지점 관리번호");

        if (isBlank(request.title())) {
            throw new BadRequestException("EVENT_TITLE_REQUIRED", "이벤트 이름은 필수입니다.");
        }
        String title = request.title().trim();
        checkLength(title, TITLE_MAX, "이벤트 이름");
        Long editingId = editing == null ? null : editing.getId();
        boolean duplicated = eventRepository.findAll().stream()
                .anyMatch(e -> !e.getId().equals(editingId) && e.getTitle().trim().equalsIgnoreCase(title));
        if (duplicated) {
            throw new ConflictException("EVENT_TITLE_DUPLICATED", "같은 이름의 이벤트가 이미 있습니다.");
        }

        if (request.dateStart() != null && request.dateEnd() != null && request.dateEnd().isBefore(request.dateStart())) {
            throw new BadRequestException("EVENT_DATE_INVALID", "종료일은 시작일과 같거나 뒤여야 합니다.");
        }

        if (Boolean.TRUE.equals(request.coupon())) {
            if (!isCount(request.couponAmount(), COUPON_AMOUNT_MAX)) {
                throw new BadRequestException("EVENT_COUPON_AMOUNT_INVALID", "지급 쿠폰 수는 1~" + COUPON_AMOUNT_MAX + "장으로 입력해야 합니다.");
            }
            if (!isCount(request.capacity(), CAPACITY_MAX)) {
                throw new BadRequestException("EVENT_CAPACITY_INVALID", "선착순 인원은 1~" + CAPACITY_MAX + "명으로 입력해야 합니다.");
            }
        }

        if (isBlank(request.description())) {
            throw new BadRequestException("EVENT_DESCRIPTION_REQUIRED", "설명은 필수입니다.");
        }
        checkLength(request.description().trim(), DESCRIPTION_MAX, "설명");
        checkLines(request.howTo(), "참여 방법");
        checkLines(request.notes(), "유의 사항");

        checkPath(request.thumbnail(), "썸네일 이미지 경로");
        checkPath(request.imageHero(), "히어로 이미지 경로");
        checkPath(request.imageDetail(), "상세 이미지 경로");

        parseStatus(request.status());
    }

    private Event.Status parseStatus(String status) {
        if (isBlank(status)) {
            return null;
        }
        try {
            return Event.Status.valueOf(status.trim());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("EVENT_STATUS_INVALID",
                    "상태는 UPCOMING · ONGOING · ENDED 중 하나이거나 비워 두어야 합니다(날짜로 자동).");
        }
    }

    // 참여 방법 · 유의 사항 — 한 줄에 하나, 최대 LINES_MAX줄 · 줄마다 LINE_MAX자
    private void checkLines(String text, String label) {
        List<String> lines = lines(text);
        if (lines.size() > LINES_MAX) {
            throw new BadRequestException("EVENT_LINES_INVALID", label + "은(는) " + LINES_MAX + "줄까지 쓸 수 있습니다.");
        }
        for (int i = 0; i < lines.size(); i++) {
            if (lines.get(i).length() > LINE_MAX) {
                throw new BadRequestException("EVENT_LINES_INVALID", label + " " + (i + 1) + "번째 줄이 " + LINE_MAX + "자를 넘습니다.");
            }
        }
    }

    // 이미지 경로 — 비우거나 사이트 안 경로("/events/...")만
    private void checkPath(String path, String label) {
        if (isBlank(path)) {
            return;
        }
        String value = path.trim();
        if (!value.startsWith("/") || value.startsWith("//")) {
            throw new BadRequestException("EVENT_PATH_INVALID", label + "는 사이트 안의 경로(/ 로 시작)만 쓸 수 있습니다.");
        }
        checkLength(value, VARCHAR_MAX_LENGTH, label);
    }

    private void checkLength(String value, int max, String label) {
        if (value.length() > max) {
            throw new BadRequestException("EVENT_FIELD_TOO_LONG", label + "은(는) " + max + "자 이내로 입력해야 합니다.");
        }
    }

    private static List<String> lines(String text) {
        return text == null ? List.of() : Arrays.stream(text.split("\n")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    // TEXT 칼럼 — 줄마다 앞뒤 공백 · 빈 줄을 지운다
    private static String cleanLines(String text) {
        return String.join("\n", lines(text));
    }

    private static String cleanPath(String path) {
        return isBlank(path) ? null : path.trim();
    }

    private static boolean isCount(Integer value, int max) {
        return value != null && value >= 1 && value <= max;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
