package com.newcafe.backend.config;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import com.newcafe.backend.entity.*;
import com.newcafe.backend.repository.*;
import com.newcafe.backend.service.SeatSchedule;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Repeatable demo reservations for the local H2 database only. */
@Component
@Profile("h2")
@ConditionalOnProperty(name = "app.test-seat-data.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class H2SeatDemoData implements ApplicationRunner {
    private final BranchRepository branches;
    private final SeatRepository seats;
    private final MemberRepository members;
    private final SeatReservationRepository reservations;
    private final ReservedChairRepository chairs;
    private final PasswordEncoder passwords;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var now = SeatSchedule.now();
        LocalDate date = SeatSchedule.defaultDate(now);
        var block = SeatSchedule.TIME_BLOCKS.stream()
                .filter(b -> SeatSchedule.stateOf(date, b, now) != com.newcafe.backend.dto.seat.SlotAvailabilityResponse.BlockState.CLOSED)
                .findFirst().orElseThrow();
        Map<String, Slot> slots = new LinkedHashMap<>();
        slots.put(date + "/" + block.start(), new Slot("live", date, block.start()));
        LocalDate tomorrow = now.toLocalDate().plusDays(1);
        slots.putIfAbsent(tomorrow + "/09:00", new Slot("next", tomorrow, LocalTime.of(9, 0)));
        for (String branchId : List.of("mapo", "gangnam", "seongsu")) {
            var branch = branches.findById(branchId).orElse(null);
            if (branch == null) continue;
            List<ChairRef> plan = new ArrayList<>();
            for (Seat seat : seats.findAllByBranchIdOrderByIdAsc(branchId)) {
                for (int no = 1; no <= seat.getCapacity(); no++) plan.add(new ChairRef(seat, no));
            }
            Collections.shuffle(plan, new Random(branchId.hashCode()));
            int requested = switch (branchId) { case "mapo" -> 47; case "gangnam" -> 43; default -> 44; };
            plan = plan.subList(0, Math.min(requested, plan.size()));
            for (Slot slot : slots.values()) seed(branch, slot, plan);
        }
    }

    private void seed(Branch branch, Slot slot, List<ChairRef> plan) {
        Set<String> taken = new HashSet<>();
        chairs.findAllBySeatBranchIdAndDateAndStartTime(branch.getId(), slot.date(), slot.start())
                .forEach(c -> taken.add(c.chairId()));
        for (int from = 0, group = 0; from < plan.size(); from += 8, group++) {
            String loginId = "sd_" + branch.getId() + "_" + (group + 1);
            Member member = members.findByLoginIdAndDeletedFalse(loginId).orElseGet(() -> {
                // Do not replace a deleted account or change an existing account's role/password.
                if (members.existsByLoginId(loginId)) return null;
                Member created = new Member();
                created.setLoginId(loginId);
                created.setNickname("좌석테스트_" + loginId);
                created.setPassword(passwords.encode("Seat-Demo-2026!"));
                return members.save(created);
            });
            if (member == null) continue;
            // Keep processed/canceled demo bookings unchanged when initialization runs again.
            List<SeatReservation> existing = reservations.findAllByMemberNoAndStatusInOrderByReservedAtDesc(member.getNo(),
                    List.of(SeatReservation.Status.ACTIVE, SeatReservation.Status.CHECKED_IN, SeatReservation.Status.CANCELED, SeatReservation.Status.NO_SHOW));
            long existingInSlot = existing.stream().filter(r -> r.getBranch().getId().equals(branch.getId())
                    && r.getDate().equals(slot.date()) && r.getStartTime().equals(slot.start())).count();
            if (existingInSlot > 0) continue;
            List<ChairRef> available = plan.subList(from, Math.min(from + 8, plan.size())).stream()
                    .filter(c -> !c.seat().isChairUnderRepair(c.no()) && !taken.contains(c.id())).toList();
            if (available.isEmpty()) continue;
            SeatReservation reservation = new SeatReservation();
            reservation.setMember(member); reservation.setBranch(branch);
            reservation.setDate(slot.date()); reservation.setStartTime(slot.start());
            reservation.setEndTime(slot.start().plusHours(1));
            reservation.setKind(SeatReservation.Kind.RESERVED); reservation.setPeople(available.size());
            for (ChairRef c : available) { reservation.addChair(c.seat(), c.no()); taken.add(c.id()); }
            reservations.saveAndFlush(reservation);
        }
    }

    private record Slot(String tag, LocalDate date, LocalTime start) {}
    private record ChairRef(Seat seat, int no) { String id() { return seat.chairId(no); } }
}
