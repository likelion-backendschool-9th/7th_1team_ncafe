package com.newcafe.backend.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.seat.BranchOccupancyResponse;
import com.newcafe.backend.dto.seat.ChairStatus;
import com.newcafe.backend.dto.seat.SeatResponse;
import com.newcafe.backend.dto.seat.SlotAvailabilityResponse;
import com.newcafe.backend.dto.seat.TimeBlockResponse;
import com.newcafe.backend.service.SeatService;

import lombok.RequiredArgsConstructor;

// 사용자용 좌석 조회 API (로그인 없이). 예약 · 취소는 SeatReservationController
@RestController
@RequestMapping("/api/v1/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    // GET /api/v1/seats?branchId=mapo
    @GetMapping
    public List<SeatResponse> findSeats(@RequestParam String branchId) {
        return seatService.findSeats(branchId);
    }

    // GET /api/v1/seats/time-blocks
    @GetMapping("/time-blocks")
    public List<TimeBlockResponse> findTimeBlocks() {
        return seatService.findTimeBlocks();
    }

    // GET /api/v1/seats/status?branchId=mapo&date=2026-10-17&start=13:00 (의자 id → 상태, 빈 의자는 빠진다)
    @GetMapping("/status")
    public Map<String, ChairStatus> findChairStatuses(
            @RequestParam String branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime start) {
        return seatService.findChairStatuses(branchId, date, start);
    }

    // GET /api/v1/seats/availability?branchId=mapo&date=2026-10-17
    @GetMapping("/availability")
    public List<SlotAvailabilityResponse> findAvailability(
            @RequestParam String branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return seatService.findAvailability(branchId, date);
    }

    // GET /api/v1/seats/occupancy (메인 "지점별 좌석 현황")
    @GetMapping("/occupancy")
    public BranchOccupancyResponse findOccupancy() {
        return seatService.findOccupancy();
    }
}
