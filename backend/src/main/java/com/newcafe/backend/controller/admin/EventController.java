package com.newcafe.backend.controller.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.event.EventApplyResponse;
import com.newcafe.backend.dto.event.admin.EventRequest;
import com.newcafe.backend.dto.event.admin.EventResponse;
import com.newcafe.backend.service.admin.EventService;

import lombok.RequiredArgsConstructor;

// 관리자용 이벤트 관리 API. 사용자용 controller.EventController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminEventController")
@RequestMapping("/api/v1/admin/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    // GET /api/v1/admin/events
    @GetMapping
    public List<EventResponse> findAll() {
        return eventService.findAll();
    }

    // GET /api/v1/admin/events/{id}
    @GetMapping("/{id}")
    public EventResponse findById(@PathVariable Long id) {
        return eventService.findById(id);
    }

    // POST /api/v1/admin/events
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse create(@RequestBody EventRequest request) {
        return eventService.create(request);
    }

    // PUT /api/v1/admin/events/{id}
    @PutMapping("/{id}")
    public EventResponse update(@PathVariable Long id, @RequestBody EventRequest request) {
        return eventService.update(id, request);
    }

    // PATCH /api/v1/admin/events/{id}/visible (노출 허가만)
    @PatchMapping("/{id}/visible")
    public EventResponse updateVisible(@PathVariable Long id, @RequestBody EventRequest.Visible request) {
        return eventService.updateVisible(id, request);
    }

    // PATCH /api/v1/admin/events/{id}/status (상태 직접 지정만, null이면 날짜로 자동)
    @PatchMapping("/{id}/status")
    public EventResponse updateStatus(@PathVariable Long id, @RequestBody EventRequest.Status request) {
        return eventService.updateStatus(id, request);
    }

    // DELETE /api/v1/admin/events/{id} (신청자가 없는 이벤트만)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        eventService.delete(id);
    }

    // GET /api/v1/admin/events/{id}/applies (참여자 목록 — 중복 신청 · 참여 인원 확인용)
    @GetMapping("/{id}/applies")
    public List<EventApplyResponse> findApplies(@PathVariable Long id) {
        return eventService.findApplies(id);
    }
}
