package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.seat.SeatReservationRequest;
import com.newcafe.backend.dto.seat.SeatReservationResponse;
import com.newcafe.backend.dto.seat.WaitlistRequest;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.SeatReservationService;

import lombok.RequiredArgsConstructor;

// 좌석 예약 · 예약대기 · 취소 API (로그인 필요)
@RestController
@RequestMapping("/api/v1/seats")
@RequiredArgsConstructor
public class SeatReservationController {

    private final SeatReservationService seatReservationService;

    // GET /api/v1/seats/reservations/me (내 예약 · 예약대기, 최신순)
    @GetMapping("/reservations/me")
    public List<SeatReservationResponse> findMine(Authentication authentication) {
        return seatReservationService.findMine(AuthService.loginMemberNo(authentication));
    }

    // POST /api/v1/seats/reservations
    @PostMapping("/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public SeatReservationResponse reserve(@RequestBody SeatReservationRequest request, Authentication authentication) {
        return seatReservationService.reserve(AuthService.loginMemberNo(authentication), request);
    }

    // POST /api/v1/seats/waitlist
    @PostMapping("/waitlist")
    @ResponseStatus(HttpStatus.CREATED)
    public SeatReservationResponse joinWaitlist(@RequestBody WaitlistRequest request, Authentication authentication) {
        return seatReservationService.joinWaitlist(AuthService.loginMemberNo(authentication), request);
    }

    // DELETE /api/v1/seats/reservations/{id} (예약 · 예약대기 취소)
    @DeleteMapping("/reservations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable Long id, Authentication authentication) {
        seatReservationService.cancel(AuthService.loginMemberNo(authentication), id);
    }
}
