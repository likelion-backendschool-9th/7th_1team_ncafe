package com.newcafe.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.seat.BranchOccupancyResponse;
import com.newcafe.backend.dto.seat.BranchOccupancyResponse.BranchSummary;
import com.newcafe.backend.dto.seat.ChairStatus;
import com.newcafe.backend.dto.seat.SeatResponse;
import com.newcafe.backend.dto.seat.SlotAvailabilityResponse;
import com.newcafe.backend.dto.seat.SlotAvailabilityResponse.BlockState;
import com.newcafe.backend.dto.seat.TimeBlockResponse;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.entity.ReservedChair;
import com.newcafe.backend.entity.Seat;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.ReservedChairRepository;
import com.newcafe.backend.repository.ReservedChairRepository.BranchSlotCount;
import com.newcafe.backend.repository.ReservedChairRepository.SlotCount;
import com.newcafe.backend.repository.SeatRepository;

import lombok.RequiredArgsConstructor;

// 사용자용 좌석 조회 — 배치 · 시간대 · 의자 상태 · 잔여석 (예약 · 취소는 SeatReservationService)
// 의자 상태는 저장하지 않고 예약된 의자(reserved_chairs)와 수리 중 좌석으로 계산한다
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private final BranchRepository branchRepository;
    private final SeatRepository seatRepository;
    private final ReservedChairRepository reservedChairRepository;

    // 한 지점의 좌석 배치
    public List<SeatResponse> findSeats(String branchId) {
        findBranch(branchId);
        return seatRepository.findAllByBranchIdOrderByIdAsc(branchId).stream()
                .map(SeatResponse::from)
                .toList();
    }

    // 예약 시간대 목록
    public List<TimeBlockResponse> findTimeBlocks() {
        return SeatSchedule.TIME_BLOCKS;
    }

    // 한 시간대의 의자 상태 (의자 id → 상태). AVAILABLE인 의자는 빠진다
    // 예약된 의자는 진행 중인 시간대면 USING, 아니면 RESERVED. 수리 중이 예약보다 우선한다
    public Map<String, ChairStatus> findChairStatuses(String branchId, LocalDate date, LocalTime start) {
        findBranch(branchId);
        TimeBlockResponse block = findBlock(start);
        boolean live = SeatSchedule.stateOf(date, block, SeatSchedule.now()) == BlockState.LIVE;
        ChairStatus taken = live ? ChairStatus.USING : ChairStatus.RESERVED;

        Map<String, ChairStatus> statuses = new LinkedHashMap<>();
        for (ReservedChair chair : reservedChairRepository.findAllBySeatBranchIdAndDateAndStartTime(branchId, date, start)) {
            statuses.put(chair.chairId(), taken);
        }
        for (Seat seat : seatRepository.findAllByBranchIdOrderByIdAsc(branchId)) {
            for (int no = 1; no <= seat.getCapacity(); no++) {
                if (seat.isChairUnderRepair(no)) statuses.put(seat.chairId(no), ChairStatus.REPAIR);
            }
        }
        return statuses;
    }

    // 한 지점 · 날짜의 시간대별 잔여석
    public List<SlotAvailabilityResponse> findAvailability(String branchId, LocalDate date) {
        findBranch(branchId);
        List<Seat> seats = seatRepository.findAllByBranchIdOrderByIdAsc(branchId);
        Map<LocalTime, Long> taken = reservedChairRepository.countGroupByStartTime(branchId, date).stream()
                .collect(Collectors.toMap(SlotCount::getStartTime, SlotCount::getCount));
        return slotsOf(seats, date, taken, SeatSchedule.now());
    }

    // 메인 "지점별 좌석 현황" — 영업 중인 지점마다 기본 날짜(오늘 · 영업 종료 뒤면 내일)의 시간대별 잔여석
    public BranchOccupancyResponse findOccupancy() {
        LocalDateTime now = SeatSchedule.now();
        LocalDate date = SeatSchedule.defaultDate(now);

        Map<String, List<Seat>> seatsByBranch = seatRepository.findAll().stream()
                .collect(Collectors.groupingBy(s -> s.getBranch().getId()));
        Map<String, Map<LocalTime, Long>> takenByBranch = reservedChairRepository.countGroupByBranchAndStartTime(date)
                .stream()
                .collect(Collectors.groupingBy(BranchSlotCount::getBranchId,
                        Collectors.toMap(BranchSlotCount::getStartTime, BranchSlotCount::getCount)));

        List<BranchOccupancyResponse.Item> branches = branchRepository.findAllByOrderBySortAscIdAsc().stream()
                .filter(Branch::isOpen)
                .map(branch -> new BranchOccupancyResponse.Item(
                        BranchSummary.from(branch),
                        slotsOf(seatsByBranch.getOrDefault(branch.getId(), List.of()), date,
                                takenByBranch.getOrDefault(branch.getId(), Map.of()), now)))
                .toList();
        return new BranchOccupancyResponse(date, branches);
    }

    // 시간대마다 잔여석 = 수리 중이 아닌 좌석의 의자 수 - 그 시간대에 찬 의자 수
    private List<SlotAvailabilityResponse> slotsOf(List<Seat> seats, LocalDate date, Map<LocalTime, Long> taken,
            LocalDateTime now) {
        int total = seats.stream().mapToInt(Seat::getCapacity).sum();
        int usable = seats.stream().mapToInt(Seat::usableCapacity).sum();
        return SeatSchedule.TIME_BLOCKS.stream()
                .map(block -> new SlotAvailabilityResponse(
                        block.start(),
                        block.end(),
                        SeatSchedule.stateOf(date, block, now),
                        (int) Math.max(0, usable - taken.getOrDefault(block.start(), 0L)),
                        total))
                .toList();
    }

    private Branch findBranch(String branchId) {
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new NotFoundException("BRANCH_NOT_FOUND", "지점을 찾을 수 없습니다. id=" + branchId));
    }

    private TimeBlockResponse findBlock(LocalTime start) {
        return SeatSchedule.findBlock(start)
                .orElseThrow(() -> new BadRequestException("INVALID_TIME_BLOCK", "예약 시간대가 아닙니다. start=" + start));
    }
}
