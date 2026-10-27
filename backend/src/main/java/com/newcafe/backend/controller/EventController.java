package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.event.EventApplyResponse;
import com.newcafe.backend.dto.event.EventResponse;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.EventService;

import lombok.RequiredArgsConstructor;

// 사용자용 이벤트 API. 조회는 로그인 없이, 참여·내 참여 기록은 로그인한 회원 기준
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    // GET /api/v1/events?branchId= (branchId 없으면 전체 지점)
    @GetMapping
    public List<EventResponse> findAll(@RequestParam(required = false) String branchId) {
        return eventService.findAll(branchId);
    }

    // GET /api/v1/events/{id}
    @GetMapping("/{id}")
    public EventResponse findById(@PathVariable Long id) {
        return eventService.findById(id);
    }

    // POST /api/v1/events/{id}/applies (참여)
    @PostMapping("/{id}/applies")
    @ResponseStatus(HttpStatus.CREATED)
    public EventApplyResponse apply(@PathVariable Long id, Authentication authentication) {
        return eventService.apply(AuthService.loginMemberNo(authentication), id);
    }

    // GET /api/v1/events/applies/me (내 참여 기록)
    @GetMapping("/applies/me")
    public List<EventApplyResponse> findMyApplies(Authentication authentication) {
        return eventService.findMyApplies(AuthService.loginMemberNo(authentication));
    }
}
