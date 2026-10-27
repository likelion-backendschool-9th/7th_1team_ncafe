package com.newcafe.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.ForbiddenException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.seat.SeatReservationRequest;
import com.newcafe.backend.dto.seat.SeatReservationResponse;
import com.newcafe.backend.dto.seat.SeatSlotRequest;
import com.newcafe.backend.dto.seat.SlotAvailabilityResponse.BlockState;
import com.newcafe.backend.dto.seat.TimeBlockResponse;
import com.newcafe.backend.dto.seat.WaitlistRequest;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.entity.ReservedChair;
import com.newcafe.backend.entity.Seat;
import com.newcafe.backend.entity.SeatReservation;
import com.newcafe.backend.entity.SeatReservation.Kind;
import com.newcafe.backend.entity.SeatReservation.Status;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.ReservedChairRepository;
import com.newcafe.backend.repository.SeatRepository;
import com.newcafe.backend.repository.SeatReservationRepository;

import lombok.RequiredArgsConstructor;

// 좌석 예약 · 예약대기 · 취소 · 내 예약 목록 (조회는 SeatService)
// 같은 의자 동시 예약은 reserved_chairs의 unique 제약이 막는다 — 먼저 조회로 거르고, 그 사이에 들어온 요청은 flush에서 걸린다
@Service
@RequiredArgsConstructor
@Transactional
public class SeatReservationService {

    // 한 사람이 동시에 가질 수 있는 남은 예약 수
    private static final int MAX_ACTIVE_RESERVATIONS = 3;

    // 최근 NO_SHOW_DAYS일 동안 노쇼가 NO_SHOW_LIMIT번 이상이면 예약 · 예약대기를 막는다
    private static final int NO_SHOW_LIMIT = 3;
    private static final int NO_SHOW_DAYS = 30;

    // 내 예약 목록에 보이는 상태 (취소한 것은 빠진다)
    private static final List<Status> VISIBLE_STATUSES = List.of(Status.ACTIVE, Status.CHECKED_IN, Status.NO_SHOW);

    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final SeatRepository seatRepository;
    private final ReservedChairRepository reservedChairRepository;
    private final SeatReservationRepository seatReservationRepository;

    // 내 예약 · 예약대기 목록, 최신순
    @Transactional(readOnly = true)
    public List<SeatReservationResponse> findMine(Long memberNo) {
        return seatReservationRepository.findAllByMemberNoAndStatusInOrderByReservedAtDesc(memberNo, VISIBLE_STATUSES)
                .stream()
                .map(SeatReservationResponse::from)
                .toList();
    }

    // 의자 단위 예약. 같은 시간대에 걸어 둔 내 예약대기는 함께 취소된다
    public SeatReservationResponse reserve(Long memberNo, SeatReservationRequest request) {
        LocalDateTime now = SeatSchedule.now();
        Slot slot = validateSlot(request.slot(), request.people(), now);
        if (slot.state() == BlockState.CLOSED) {
            throw new ConflictException("TIME_BLOCK_CLOSED", "이미 지난 시간대예요.");
        }
        Member member = findMember(memberNo);
        checkNoShow(memberNo, now);
        long active = seatReservationRepository.countByMemberNoAndKindAndStatusAndDateGreaterThanEqual(
                memberNo, Kind.RESERVED, Status.ACTIVE, now.toLocalDate());
        if (active >= MAX_ACTIVE_RESERVATIONS) {
            throw new ConflictException("RESERVATION_LIMIT",
                    "예약은 한 번에 " + MAX_ACTIVE_RESERVATIONS + "건까지 할 수 있어요. 지난 예약이 끝나거나 취소한 뒤 다시 시도해 주세요.");
        }

        List<String> chairIds = request.chairIds() == null ? List.of() : request.chairIds();
        if (chairIds.size() != request.people()) {
            throw new BadRequestException("CHAIR_COUNT_MISMATCH", "인원 수만큼 의자를 골라야 합니다.");
        }
        if (new HashSet<>(chairIds).size() != chairIds.size()) {
            throw new BadRequestException("DUPLICATE_CHAIR", "같은 의자를 두 번 고를 수 없습니다.");
        }

        SeatReservation reservation = new SeatReservation();
        reservation.setMember(member);
        reservation.setBranch(slot.branch());
        reservation.setDate(slot.date());
        reservation.setStartTime(slot.block().start());
        reservation.setEndTime(slot.block().end());
        reservation.setPeople(request.people());
        reservation.setKind(Kind.RESERVED);
        addChairs(reservation, chairIds);

        // 이미 찬 의자 — 대부분은 여기서 걸러진다
        Set<String> taken = reservedChairRepository
                .findAllBySeatBranchIdAndDateAndStartTime(slot.branch().getId(), slot.date(), slot.block().start())
                .stream()
                .map(ReservedChair::chairId)
                .collect(Collectors.toSet());
        if (chairIds.stream().anyMatch(taken::contains)) {
            throw seatTaken();
        }

        // 조회와 저장 사이에 같은 의자를 잡은 요청이 있으면 unique 제약에 걸린다 (트랜잭션 전체가 롤백돼 일부 의자만 잡히지 않는다)
        try {
            seatReservationRepository.saveAndFlush(reservation);
        } catch (DataIntegrityViolationException e) {
            throw seatTaken();
        }

        seatReservationRepository.cancelWaiting(memberNo, slot.branch().getId(), slot.date(), slot.block().start(),
                OffsetDateTime.now(), Kind.WAITING, Status.ACTIVE, Status.CANCELED);
        return SeatReservationResponse.from(reservation);
    }

    // 예약대기 — 의자 없이 시간대 · 인원만. 시간대 시작 전까지만 신청할 수 있다
    public SeatReservationResponse joinWaitlist(Long memberNo, WaitlistRequest request) {
        LocalDateTime now = SeatSchedule.now();
        Slot slot = validateSlot(request.slot(), request.people(), now);
        if (slot.state() != BlockState.OPEN) {
            throw new ConflictException("WAITLIST_CLOSED", "예약대기는 시간대 시작 전까지만 신청할 수 있어요.");
        }
        Member member = findMember(memberNo);
        checkNoShow(memberNo, now);
        if (seatReservationRepository.existsByMemberNoAndBranchIdAndDateAndStartTimeAndKindAndStatus(memberNo,
                slot.branch().getId(), slot.date(), slot.block().start(), Kind.WAITING, Status.ACTIVE)) {
            throw new ConflictException("WAITLIST_ALREADY_JOINED", "이미 예약대기를 신청한 시간대예요.");
        }

        SeatReservation waiting = new SeatReservation();
        waiting.setMember(member);
        waiting.setBranch(slot.branch());
        waiting.setDate(slot.date());
        waiting.setStartTime(slot.block().start());
        waiting.setEndTime(slot.block().end());
        waiting.setPeople(request.people());
        waiting.setKind(Kind.WAITING);
        return SeatReservationResponse.from(seatReservationRepository.save(waiting));
    }

    // 예약 · 예약대기 취소 (본인 것만). 예약은 시간대 시작 전까지, 예약대기는 언제든
    // 예약을 취소해 자리가 나면 같은 시간대 예약대기 중 인원이 맞는 것에 알림 시각을 남긴다
    public void cancel(Long memberNo, Long reservationId) {
        SeatReservation reservation = seatReservationRepository.findWithChairsById(reservationId)
                .orElseThrow(() -> new NotFoundException("RESERVATION_NOT_FOUND",
                        "예약을 찾을 수 없습니다. id=" + reservationId));
        if (!reservation.getMember().getNo().equals(memberNo)) {
            throw new ForbiddenException("RESERVATION_FORBIDDEN", "본인 예약만 취소할 수 있습니다.");
        }
        if (reservation.getStatus() != Status.ACTIVE) {
            throw new ConflictException("RESERVATION_NOT_ACTIVE", "이미 취소했거나 이용이 끝난 예약이에요.");
        }
        if (reservation.getKind() == Kind.RESERVED && stateOf(reservation, SeatSchedule.now()) != BlockState.OPEN) {
            throw new ConflictException("RESERVATION_STARTED", "시작된 예약은 취소할 수 없어요.");
        }

        boolean freed = !reservation.getChairs().isEmpty();
        reservation.setStatus(Status.CANCELED);
        reservation.setCanceledAt(OffsetDateTime.now());
        reservation.getChairs().clear(); // orphanRemoval로 reserved_chairs 행이 지워져 자리가 풀린다
        seatReservationRepository.flush();

        if (freed) {
            notifyWaiting(reservation);
        }
    }

    // 그 시간대 빈 의자 수 이하 인원으로 대기 중인 예약대기에 알림 시각을 남긴다
    private void notifyWaiting(SeatReservation canceled) {
        String branchId = canceled.getBranch().getId();
        long usable = seatRepository.sumUsableCapacity(branchId);
        long taken = reservedChairRepository.countBySeatBranchIdAndDateAndStartTimeAndSeatUnderRepairFalse(
                branchId, canceled.getDate(), canceled.getStartTime());
        int available = (int) (usable - taken);
        if (available > 0) {
            seatReservationRepository.markNotified(branchId, canceled.getDate(), canceled.getStartTime(), available,
                    OffsetDateTime.now(), Kind.WAITING, Status.ACTIVE);
        }
    }

    // 의자 id("T03-1")를 좌석 · 의자 번호로 바꿔 예약에 붙인다. 없는 의자 · 수리 중 좌석은 거절한다
    private void addChairs(SeatReservation reservation, List<String> chairIds) {
        List<ChairRef> refs = chairIds.stream().map(SeatReservationService::parseChairId).toList();
        Set<String> codes = refs.stream().map(ChairRef::code).collect(Collectors.toSet());
        Map<String, Seat> seats = seatRepository.findAllByBranchIdAndCodeIn(reservation.getBranch().getId(), codes)
                .stream()
                .collect(Collectors.toMap(Seat::getCode, Function.identity()));

        for (ChairRef ref : refs) {
            Seat seat = seats.get(ref.code());
            if (seat == null || ref.no() < 1 || ref.no() > seat.getCapacity()) {
                throw invalidChair(ref.code() + "-" + ref.no());
            }
            if (seat.isChairUnderRepair(ref.no())) {
                throw new ConflictException("SEAT_UNDER_REPAIR", "수리 중인 자리예요. seat=" + seat.getCode());
            }
            reservation.addChair(seat, ref.no());
        }
    }

    // "T03-1" → 좌석 코드 "T03" · 의자 번호 1
    private static ChairRef parseChairId(String chairId) {
        int dash = chairId == null ? -1 : chairId.lastIndexOf('-');
        if (dash <= 0) {
            throw invalidChair(chairId);
        }
        try {
            return new ChairRef(chairId.substring(0, dash), Integer.parseInt(chairId.substring(dash + 1)));
        } catch (NumberFormatException e) {
            throw invalidChair(chairId);
        }
    }

    // 요청의 지점 · 날짜 · 시간대 · 인원 확인
    private Slot validateSlot(SeatSlotRequest request, Integer people, LocalDateTime now) {
        if (request == null || request.branchId() == null || request.date() == null || request.start() == null) {
            throw new BadRequestException("INVALID_SLOT", "지점 · 날짜 · 시간대를 모두 골라 주세요.");
        }
        if (people == null || people < 1 || people > SeatSchedule.MAX_PEOPLE) {
            throw new BadRequestException("INVALID_PEOPLE", "인원은 1~" + SeatSchedule.MAX_PEOPLE + "명이어야 합니다.");
        }
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> new NotFoundException("BRANCH_NOT_FOUND",
                        "지점을 찾을 수 없습니다. id=" + request.branchId()));
        if (!branch.isOpen()) {
            throw new ConflictException("BRANCH_CLOSED", "지금은 영업하지 않는 지점이에요.");
        }
        if (!SeatSchedule.isBookableDate(request.date(), now)) {
            throw new BadRequestException("INVALID_DATE",
                    "예약은 오늘부터 " + SeatSchedule.BOOKING_DAYS + "일 안에서만 할 수 있습니다.");
        }
        TimeBlockResponse block = SeatSchedule.findBlock(request.start())
                .orElseThrow(() -> new BadRequestException("INVALID_TIME_BLOCK",
                        "예약 시간대가 아닙니다. start=" + request.start()));
        return new Slot(branch, request.date(), block, SeatSchedule.stateOf(request.date(), block, now));
    }

    private void checkNoShow(Long memberNo, LocalDateTime now) {
        long noShows = seatReservationRepository.countByMemberNoAndStatusAndDateGreaterThanEqual(
                memberNo, Status.NO_SHOW, now.toLocalDate().minusDays(NO_SHOW_DAYS));
        if (noShows >= NO_SHOW_LIMIT) {
            throw new ForbiddenException("RESERVATION_BLOCKED",
                    "최근 " + NO_SHOW_DAYS + "일 동안 노쇼가 " + NO_SHOW_LIMIT + "번 있어 예약할 수 없어요.");
        }
    }

    private Member findMember(Long memberNo) {
        return memberRepository.findByNoAndDeletedFalse(memberNo)
                .orElseThrow(() -> new NotFoundException("MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다. no=" + memberNo));
    }

    private static BlockState stateOf(SeatReservation reservation, LocalDateTime now) {
        TimeBlockResponse block = new TimeBlockResponse(reservation.getStartTime(), reservation.getEndTime());
        return SeatSchedule.stateOf(reservation.getDate(), block, now);
    }

    private static ConflictException seatTaken() {
        return new ConflictException("SEAT_ALREADY_RESERVED", "방금 다른 사람이 예약한 자리예요. 다른 자리를 골라 주세요.");
    }

    private static BadRequestException invalidChair(String chairId) {
        return new BadRequestException("INVALID_CHAIR", "없는 의자입니다. chairId=" + chairId);
    }

    // 확인을 마친 요청 시간대
    private record Slot(Branch branch, LocalDate date, TimeBlockResponse block, BlockState state) {
    }

    // 의자 id를 나눈 것
    private record ChairRef(String code, int no) {
    }
}
