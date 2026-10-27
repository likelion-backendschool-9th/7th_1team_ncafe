package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.newcafe.backend.common.exception.ApiException;
import com.newcafe.backend.dto.seat.SeatReservationRequest;
import com.newcafe.backend.dto.seat.SeatSlotRequest;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.entity.ReservedChair;
import com.newcafe.backend.entity.Seat;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.ReservedChairRepository;
import com.newcafe.backend.repository.SeatRepository;
import com.newcafe.backend.repository.SeatReservationRepository;
import com.newcafe.backend.service.SeatReservationService;
import com.newcafe.backend.service.SeatSchedule;

// 같은 의자를 동시에 예약할 때 한 건만 들어가는지 (reserved_chairs unique 제약 + saveAndFlush).
// 스레드마다 따로 커밋돼야 서로의 예약이 보이므로 @Transactional을 붙이지 않고, 끝나면 직접 지운다.
@SpringBootTest(properties = { "race.ranking.url=http://localhost:9", "race.ranking.key=test" })
class SeatReservationConcurrencyTests {

    private static final int THREADS = 10;
    private static final LocalTime START = LocalTime.of(13, 0);

    @Autowired SeatReservationService service;
    @Autowired BranchRepository branches;
    @Autowired SeatRepository seats;
    @Autowired MemberRepository members;
    @Autowired SeatReservationRepository reservations;
    @Autowired ReservedChairRepository reservedChairs;

    private final List<Member> people = new ArrayList<>();
    private LocalDate tomorrow;

    @BeforeEach
    void setUp() {
        Branch branch = new Branch();
        branch.setId("conc");
        branch.setName("동시성점");
        branch.setAddress("서울시");
        branch.setOpen(true);
        branches.saveAndFlush(branch);
        saveSeat(branch, "T01", Seat.Type.TABLE, 2);
        saveSeat(branch, "B01", Seat.Type.BAR, 1);
        for (int i = 0; i < THREADS; i++) {
            Member member = new Member();
            member.setLoginId("conc" + i);
            member.setPassword("x");
            member.setNickname("conc" + i);
            people.add(members.saveAndFlush(member));
        }
        tomorrow = SeatSchedule.now().toLocalDate().plusDays(1);
    }

    @AfterEach
    void tearDown() {
        reservations.deleteAll(); // 의자(reserved_chairs)는 cascade로 함께 지워진다
        seats.deleteAll();
        members.deleteAll(people);
        branches.deleteById("conc");
    }

    @Test
    void sameChairAtTheSameTimeIsReservedOnlyOnce() throws Exception {
        List<Result> results = runAtOnce(i -> List.of("T01-1"));

        assertEquals(1, count(results, null), "한 명만 성공해야 한다: " + results);
        assertEquals(THREADS - 1, count(results, "SEAT_ALREADY_RESERVED"), "나머지는 409여야 한다: " + results);
        assertEquals(List.of("T01-1"), chairsInSlot());
    }

    @Test
    void overlappingRequestsNeverLeavePartialReservations() throws Exception {
        // 짝수는 T01-1 + T01-2, 홀수는 T01-2 + B01-1 — 모두 T01-2가 겹치므로 딱 한 건만 성공한다
        List<Result> results = runAtOnce(i -> i % 2 == 0 ? List.of("T01-1", "T01-2") : List.of("T01-2", "B01-1"));

        assertEquals(1, count(results, null), "한 명만 성공해야 한다: " + results);
        assertEquals(THREADS - 1, count(results, "SEAT_ALREADY_RESERVED"), "나머지는 409여야 한다: " + results);

        // 실패한 요청의 겹치지 않은 의자(T01-1 또는 B01-1)가 따로 남아 있으면 안 된다
        Result winner = results.stream().filter(r -> r.code() == null).findFirst().orElseThrow();
        assertEquals(winner.chairIds().stream().sorted().toList(), chairsInSlot());
    }

    // THREADS명이 동시에 출발해 chairsOf(i)를 예약한다
    private List<Result> runAtOnce(java.util.function.IntFunction<List<String>> chairsOf) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch ready = new CountDownLatch(THREADS);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Result>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < THREADS; i++) {
                Long memberNo = people.get(i).getNo();
                List<String> chairIds = chairsOf.apply(i);
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    try {
                        service.reserve(memberNo, new SeatReservationRequest(
                                new SeatSlotRequest("conc", tomorrow, START), chairIds.size(), chairIds));
                        return new Result(chairIds, null);
                    } catch (ApiException e) {
                        return new Result(chairIds, e.getCode());
                    }
                }));
            }
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            go.countDown();
            List<Result> results = new ArrayList<>();
            for (Future<Result> f : futures) {
                results.add(f.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private List<String> chairsInSlot() {
        return reservedChairs.findAllBySeatBranchIdAndDateAndStartTime("conc", tomorrow, START).stream()
                .map(ReservedChair::chairId)
                .sorted()
                .toList();
    }

    private static long count(List<Result> results, String code) {
        return results.stream().filter(r -> java.util.Objects.equals(r.code(), code)).count();
    }

    private void saveSeat(Branch branch, String code, Seat.Type type, int capacity) {
        Seat seat = new Seat();
        seat.setBranch(branch);
        seat.setCode(code);
        seat.setSection(type == Seat.Type.BAR ? Seat.Section.PADDOCK : Seat.Section.GRANDSTAND);
        seat.setType(type);
        seat.setCapacity(capacity);
        seats.saveAndFlush(seat);
    }

    // code가 null이면 성공
    private record Result(List<String> chairIds, String code) {
    }
}
