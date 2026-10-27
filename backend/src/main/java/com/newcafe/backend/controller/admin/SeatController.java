package com.newcafe.backend.controller.admin;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.seat.admin.SeatRepairRequest;
import com.newcafe.backend.dto.seat.admin.SeatReservationResponse;
import com.newcafe.backend.dto.seat.admin.SeatResponse;
import com.newcafe.backend.service.admin.SeatService;

import lombok.RequiredArgsConstructor;

// 관리자용 좌석 관리 API. 사용자용 controller.SeatController와 빈 이름이 겹치지 않도록 이름을 지정한다.
@RestController("adminSeatController")
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    // GET /api/v1/admin/branches/{branchId}/seats
    @GetMapping("/branches/{branchId}/seats")
    public List<SeatResponse> findSeats(@PathVariable String branchId) {
        return seatService.findSeats(branchId);
    }

    // PATCH /api/v1/admin/branches/{branchId}/seats/{code}/repair (수리 중 설정 · 해제)
    @PatchMapping("/branches/{branchId}/seats/{code}/repair")
    public SeatResponse updateRepair(@PathVariable String branchId,
                                     @PathVariable String code,
                                     @RequestBody SeatRepairRequest request) {
        return seatService.updateRepair(branchId, code, request);
    }

    // GET /api/v1/admin/branches/{branchId}/seat-reservations?date=2026-10-17
    @GetMapping("/branches/{branchId}/seat-reservations")
    public List<SeatReservationResponse> findReservations(
            @PathVariable String branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return seatService.findReservations(branchId, date);
    }

    // PATCH /api/v1/admin/seat-reservations/{id}/check-in (방문 확인)
    @PatchMapping("/seat-reservations/{id}/check-in")
    public SeatReservationResponse checkIn(@PathVariable Long id) {
        return seatService.checkIn(id);
    }

    // PATCH /api/v1/admin/seat-reservations/{id}/no-show (노쇼 처리)
    @PatchMapping("/seat-reservations/{id}/no-show")
    public SeatReservationResponse markNoShow(@PathVariable Long id) {
        return seatService.markNoShow(id);
    }
}
