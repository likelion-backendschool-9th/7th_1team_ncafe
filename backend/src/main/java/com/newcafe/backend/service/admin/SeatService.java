package com.newcafe.backend.service.admin;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.seat.admin.SeatRepairRequest;
import com.newcafe.backend.dto.seat.admin.SeatReservationResponse;
import com.newcafe.backend.dto.seat.admin.SeatResponse;
import com.newcafe.backend.entity.Seat;
import com.newcafe.backend.entity.SeatReservation;
import com.newcafe.backend.entity.SeatReservation.Kind;
import com.newcafe.backend.entity.SeatReservation.Status;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.SeatRepository;
import com.newcafe.backend.repository.SeatReservationRepository;
import com.newcafe.backend.service.SeatSchedule;

import lombok.RequiredArgsConstructor;

// 관리자용 좌석 관리 — 수리 중 설정 · 예약 현황 · 방문 확인 · 노쇼 처리.
// 사용자용 service.SeatService와 빈 이름이 겹치지 않도록 이름을 지정한다.
@Service("adminSeatService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    // 시작 시각 몇 분 전부터 방문 확인을 할 수 있는지 (안내 문구 "10분 전 도착"보다 넉넉하게)
    private static final Duration CHECK_IN_EARLY = Duration.ofMinutes(30);

    private final com.newcafe.backend.service.BranchOperationLogService operationLogs;
    private final BranchRepository branchRepository;
    private final com.newcafe.backend.service.BranchAdminService branchAccess;
    private final SeatRepository seatRepository;
    private final SeatReservationRepository seatReservationRepository;

    // 한 지점의 좌석 목록 (수리 중 여부 포함)
    public List<SeatResponse> findSeats(String branchId) {
        checkBranch(branchId);
        return seatRepository.findAllByBranchIdOrderByIdAsc(branchId).stream()
                .map(SeatResponse::from)
                .toList();
    }

    // 수리 중 설정 · 해제. 이미 잡힌 예약은 그대로 두고(직원이 손님에게 안내), 새 예약만 막는다
    @Transactional
    public SeatResponse updateRepair(String branchId, String code, SeatRepairRequest request, Long actor) {
        if (request == null || request.underRepair() == null) {
            throw new BadRequestException("INVALID_REPAIR", "수리 중 여부(underRepair)는 필수입니다.");
        }
        Seat seat = seatRepository.findForUpdate(branchId, code)
                .orElseThrow(() -> new NotFoundException("SEAT_NOT_FOUND",
                        "좌석을 찾을 수 없습니다. branchId=" + branchId + ", code=" + code));
        if (request.underRepair() && !seat.isUnderRepair()) {
            requireAcknowledgement(seat, null, request);
        }
        operationLogs.record(branchId, actor, "SEAT_REPAIR", code, seat.isUnderRepair(), request.underRepair());
        seat.setUnderRepair(request.underRepair());
        return SeatResponse.from(seat);
    }

    public List<SeatReservationResponse> repairConflicts(String branchId, String code, Integer chairNo) {
        Seat seat = seatRepository.findByBranchIdAndCode(branchId, code)
                .orElseThrow(() -> new NotFoundException("SEAT_NOT_FOUND", "좌석을 찾을 수 없습니다."));
        validateChair(seat, chairNo);
        return conflicts(seat, chairNo).stream().map(SeatReservationResponse::from).toList();
    }

    @Transactional
    public SeatResponse updateChairRepair(String branchId, String code, int chairNo, SeatRepairRequest request, Long actor) {
        if (request == null || request.underRepair() == null) {
            throw new BadRequestException("INVALID_REPAIR", "수리 중 여부는 필수입니다.");
        }
        Seat seat = seatRepository.findForUpdate(branchId, code)
                .orElseThrow(() -> new NotFoundException("SEAT_NOT_FOUND", "좌석을 찾을 수 없습니다."));
        validateChair(seat, chairNo);
        if (seat.isUnderRepair()) {
            throw new ConflictException("TABLE_UNDER_REPAIR", "테이블 전체 수리를 먼저 해제해주세요.");
        }
        if (request.underRepair() && !seat.getRepairChairNos().contains(chairNo)) {
            requireAcknowledgement(seat, chairNo, request);
        }
        operationLogs.record(branchId, actor, "CHAIR_REPAIR", seat.chairId(chairNo),
                seat.getRepairChairNos().contains(chairNo), request.underRepair());
        if (request.underRepair()) seat.getRepairChairNos().add(chairNo);
        else seat.getRepairChairNos().remove(chairNo);
        return SeatResponse.from(seat);
    }

    private List<SeatReservation> conflicts(Seat seat, Integer chairNo) {
        LocalDateTime now = SeatSchedule.now();
        return seatReservationRepository.findRepairConflicts(seat.getId(), chairNo,
                now.toLocalDate(), now.toLocalTime(), List.of(Status.ACTIVE, Status.CHECKED_IN));
    }

    private void requireAcknowledgement(Seat seat, Integer chairNo, SeatRepairRequest request) {
        var acknowledged = request.acknowledgedReservationIds() == null ? java.util.Set.<Long>of()
                : new java.util.HashSet<>(request.acknowledgedReservationIds());
        if (conflicts(seat, chairNo).stream().anyMatch(r -> !acknowledged.contains(r.getId()))) {
            throw new ConflictException("REPAIR_RESERVATION_CONFIRMATION_REQUIRED",
                    "진행 중이거나 예정된 예약이 있습니다. 영향을 받는 예약을 다시 확인한 뒤 수리를 설정해주세요.");
        }
    }

    private void validateChair(Seat seat, Integer chairNo) {
        if (chairNo != null && (chairNo < 1 || chairNo > seat.getCapacity())) {
            throw new BadRequestException("INVALID_CHAIR", "없는 의자 번호입니다.");
        }
    }

    // 한 지점 · 날짜의 예약 · 예약대기 현황, 시간대순 (취소 · 노쇼 포함)
    public List<SeatReservationResponse> findReservations(String branchId, LocalDate date) {
        checkBranch(branchId);
        return seatReservationRepository.findAllByBranchIdAndDateOrderByStartTimeAscReservedAtAsc(branchId, date)
                .stream()
                .map(SeatReservationResponse::from)
                .toList();
    }

    // 방문 확인 — 오늘 예약만, 시작 30분 전부터 끝나기 전까지
    @Transactional
    public SeatReservationResponse checkIn(Long reservationId, Long actor) {
        SeatReservation reservation = findActiveReservation(reservationId, actor);
        LocalDateTime now = SeatSchedule.now();
        LocalDateTime start = reservation.getDate().atTime(reservation.getStartTime());
        LocalDateTime end = reservation.getDate().atTime(reservation.getEndTime());
        if (now.isBefore(start.minus(CHECK_IN_EARLY)) || !now.isBefore(end)) {
            throw new ConflictException("CHECK_IN_NOT_AVAILABLE",
                    "방문 확인은 시작 " + CHECK_IN_EARLY.toMinutes() + "분 전부터 끝나기 전까지 할 수 있어요.");
        }
        operationLogs.record(reservation.getBranch().getId(), actor, "RESERVATION_CHECK_IN",
                reservationId.toString(), reservation.getStatus(), Status.CHECKED_IN);
        reservation.setStatus(Status.CHECKED_IN);
        return SeatReservationResponse.from(reservation);
    }

    // 노쇼 처리 — 시작 시각이 지난 예약만. 의자는 이용 기록으로 남긴다(풀지 않는다)
    // 최근 노쇼가 쌓이면 SeatReservationService가 그 회원의 예약을 막는다
    @Transactional
    public SeatReservationResponse markNoShow(Long reservationId, Long actor) {
        SeatReservation reservation = findActiveReservation(reservationId, actor);
        LocalDateTime start = reservation.getDate().atTime(reservation.getStartTime());
        if (SeatSchedule.now().isBefore(start)) {
            throw new ConflictException("NO_SHOW_TOO_EARLY", "시작 시각이 지난 예약만 노쇼로 처리할 수 있어요.");
        }
        operationLogs.record(reservation.getBranch().getId(), actor, "RESERVATION_NO_SHOW",
                reservationId.toString(), reservation.getStatus(), Status.NO_SHOW);
        reservation.setStatus(Status.NO_SHOW);
        return SeatReservationResponse.from(reservation);
    }

    // 방문 확인 · 노쇼 대상 — 유효한 의자 예약(예약대기 제외)
    private SeatReservation findActiveReservation(Long reservationId, Long actor) {
        SeatReservation reservation = seatReservationRepository.findForAdminUpdate(reservationId)
                .orElseThrow(() -> new NotFoundException("RESERVATION_NOT_FOUND",
                        "예약을 찾을 수 없습니다. id=" + reservationId));
        branchAccess.requireAccess(actor, reservation.getBranch().getId());
        if (reservation.getKind() != Kind.RESERVED) {
            throw new ConflictException("RESERVATION_IS_WAITLIST", "예약대기는 방문 확인 · 노쇼 처리를 할 수 없어요.");
        }
        if (reservation.getStatus() != Status.ACTIVE) {
            throw new ConflictException("RESERVATION_NOT_ACTIVE", "이미 취소했거나 처리한 예약이에요.");
        }
        return reservation;
    }

    private void checkBranch(String branchId) {
        if (!branchRepository.existsById(branchId)) {
            throw new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다. id=" + branchId);
        }
    }
}
