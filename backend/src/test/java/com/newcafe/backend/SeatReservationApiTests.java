package com.newcafe.backend;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.entity.Seat;
import com.newcafe.backend.entity.SeatReservation;
import com.newcafe.backend.repository.BranchRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.SeatRepository;
import com.newcafe.backend.repository.SeatReservationRepository;
import com.newcafe.backend.service.SeatSchedule;

// 좌석 조회 · 예약 · 예약대기 · 취소 · 관리자 API. 테스트마다 롤백된다.
// 좌석은 T01(2인 테이블) · B01(바석) 두 자리 = 의자 3석. 예약 날짜는 항상 예약 가능한 내일 13:00 시간대.
// race.ranking.*은 RaceService가 요구하는 값이라 넣는다 (공용 테스트 설정에 생기면 지운다).
@SpringBootTest(properties = { "race.ranking.url=http://localhost:9", "race.ranking.key=test" })
@Transactional
class SeatReservationApiTests {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired BranchRepository branches;
    @Autowired SeatRepository seats;
    @Autowired MemberRepository members;
    @Autowired SeatReservationRepository reservations;
    private MockMvc mvc;

    private Branch branch;
    private Member alice;
    private Member bob;
    private Member admin;
    private LocalDate today;
    private LocalDate tomorrow;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain).build();
        branch = saveBranch("test", true);
        saveSeat("T01", Seat.Section.GRANDSTAND, Seat.Type.TABLE, 2, Set.of(Seat.Feature.OUTLET));
        saveSeat("B01", Seat.Section.PADDOCK, Seat.Type.BAR, 1, Set.of(Seat.Feature.BAR, Seat.Feature.OUTLET));
        alice = saveMember("alice");
        bob = saveMember("bob");
        admin = saveMember("admin");
        admin.setRole(Member.Role.ADMIN);
        today = SeatSchedule.now().toLocalDate();
        tomorrow = today.plusDays(1);
    }

    // ───────── 조회 · 권한 ─────────

    @Test
    void anonymousCanReadSeatsButMustLoginToReserve() throws Exception {
        mvc.perform(get("/api/v1/seats").param("branchId", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("T01"))
                .andExpect(jsonPath("$[0].capacity").value(2))
                .andExpect(jsonPath("$[1].features[0]").value("OUTLET"))
                .andExpect(jsonPath("$[1].features[1]").value("BAR"));
        mvc.perform(get("/api/v1/seats/time-blocks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(13))
                .andExpect(jsonPath("$[0].start").value("09:00"))
                .andExpect(jsonPath("$[12].end").value("22:00"));

        mvc.perform(post("/api/v1/seats/reservations").with(csrf())
                .contentType("application/json").content(reserveBody(tomorrow, "13:00", "T01-1")))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/seats/reservations/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void reservingChairShowsItAsReservedAndReducesAvailability() throws Exception {
        reserve(alice, tomorrow, "13:00", "T01-1")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.kind").value("RESERVED"))
                .andExpect(jsonPath("$.branchName").value("테스트점"))
                .andExpect(jsonPath("$.start").value("13:00"))
                .andExpect(jsonPath("$.end").value("14:00"))
                .andExpect(jsonPath("$.chairIds[0]").value("T01-1"))
                .andExpect(jsonPath("$.chairLabels[0]").value("T01 1번"));

        mvc.perform(get("/api/v1/seats/status")
                .param("branchId", "test").param("date", tomorrow.toString()).param("start", "13:00"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"T01-1\":\"RESERVED\"}", JsonCompareMode.STRICT));
        // 13:00은 시간대 목록의 다섯 번째 (09 · 10 · 11 · 12 · 13)
        mvc.perform(get("/api/v1/seats/availability").param("branchId", "test").param("date", tomorrow.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[4].start").value("13:00"))
                .andExpect(jsonPath("$[4].state").value("OPEN"))
                .andExpect(jsonPath("$[4].available").value(2))
                .andExpect(jsonPath("$[4].total").value(3))
                .andExpect(jsonPath("$[3].available").value(3));
        mvc.perform(get("/api/v1/seats/reservations/me").session(user(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void occupancyListsOnlyOpenBranches() throws Exception {
        saveBranch("closed", false);
        mvc.perform(get("/api/v1/seats/occupancy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branches.length()").value(1))
                .andExpect(jsonPath("$.branches[0].branch.id").value("test"))
                .andExpect(jsonPath("$.branches[0].slots.length()").value(13))
                .andExpect(jsonPath("$.branches[0].slots[0].total").value(3));
    }

    @Test
    void branchesFollowSortThenId() throws Exception {
        // sort가 작을수록 앞, 같으면 ID 순 — 맨 앞 지점이 손님 화면의 기본 선택
        Branch first = saveBranch("zeta", true);
        first.setSort(-1);
        saveBranch("alpha", true); // sort 0 (기본값) — "test"와 같아 ID 순으로 앞
        branches.flush();

        mvc.perform(get("/api/v1/branches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("zeta"))
                .andExpect(jsonPath("$[0].sort").value(-1))
                .andExpect(jsonPath("$[1].id").value("alpha"))
                .andExpect(jsonPath("$[2].id").value("test"));
        mvc.perform(get("/api/v1/seats/occupancy"))
                .andExpect(jsonPath("$.branches[0].branch.id").value("zeta"))
                .andExpect(jsonPath("$.branches[1].branch.id").value("alpha"))
                .andExpect(jsonPath("$.branches[2].branch.id").value("test"));
    }

    // ───────── 예약 규칙 ─────────

    @Test
    void takenChairReturns409AndSavesNoneOfTheOtherChairs() throws Exception {
        reserve(alice, tomorrow, "13:00", "T01-1").andExpect(status().isCreated());

        // T01-1이 겹치므로 T01-2도 잡히면 안 된다 (전부 되거나 전부 안 되거나)
        reserve(bob, tomorrow, "13:00", "T01-1", "T01-2")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_ALREADY_RESERVED"));
        mvc.perform(get("/api/v1/seats/status")
                .param("branchId", "test").param("date", tomorrow.toString()).param("start", "13:00"))
                .andExpect(content().json("{\"T01-1\":\"RESERVED\"}", JsonCompareMode.STRICT));
    }

    @Test
    void invalidRequestsAreRejected() throws Exception {
        reserveFor(alice, tomorrow, "13:00", 1, "T01-1", "T01-2")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CHAIR_COUNT_MISMATCH"));
        reserve(alice, tomorrow, "13:00", "T01-1", "T01-1")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DUPLICATE_CHAIR"));
        reserve(alice, tomorrow, "13:00", "T01-9")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_CHAIR"));
        reserve(alice, tomorrow, "13:00", "X99-1")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_CHAIR"));
        reserve(alice, tomorrow, "13:00", "T01")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_CHAIR"));
        reserve(alice, today.minusDays(1), "13:00", "T01-1")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_DATE"));
        reserve(alice, today.plusDays(SeatSchedule.BOOKING_DAYS), "13:00", "T01-1")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_DATE"));
        reserve(alice, tomorrow, "13:30", "T01-1")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_TIME_BLOCK"));

        branch.setOpen(false);
        reserve(alice, tomorrow, "13:00", "T01-1")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BRANCH_CLOSED"));
    }

    @Test
    void onlyOwnerCanCancelAndCancelFreesTheChair() throws Exception {
        Long id = idOf(reserve(alice, tomorrow, "13:00", "T01-1").andExpect(status().isCreated()));

        mvc.perform(delete("/api/v1/seats/reservations/" + id).with(csrf()).session(user(bob)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("RESERVATION_FORBIDDEN"));
        mvc.perform(delete("/api/v1/seats/reservations/" + id).with(csrf()).session(user(alice)))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/seats/reservations/" + id).with(csrf()).session(user(alice)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_ACTIVE"));

        // 취소한 예약은 내 목록에서 빠지고, 같은 의자를 다른 사람이 예약할 수 있다
        mvc.perform(get("/api/v1/seats/reservations/me").session(user(alice)))
                .andExpect(jsonPath("$.length()").value(0));
        reserve(bob, tomorrow, "13:00", "T01-1").andExpect(status().isCreated());
    }

    @Test
    void onePersonCanHoldAtMostThreeReservations() throws Exception {
        reserve(alice, tomorrow, "13:00", "B01-1").andExpect(status().isCreated());
        reserve(alice, tomorrow, "14:00", "B01-1").andExpect(status().isCreated());
        reserve(alice, tomorrow, "15:00", "B01-1").andExpect(status().isCreated());
        reserve(alice, tomorrow, "16:00", "B01-1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_LIMIT"));
    }

    @Test
    void threeRecentNoShowsBlockReservationAndWaitlist() throws Exception {
        for (int i = 1; i <= 3; i++) {
            saveReservation(alice, today.minusDays(i), LocalTime.of(13, 0), LocalTime.of(14, 0),
                    SeatReservation.Status.NO_SHOW);
        }
        reserve(alice, tomorrow, "13:00", "T01-1")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("RESERVATION_BLOCKED"));
        joinWaitlist(alice, tomorrow, "13:00", 1)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("RESERVATION_BLOCKED"));
        // 다른 회원은 그대로 예약할 수 있다
        reserve(bob, tomorrow, "13:00", "T01-1").andExpect(status().isCreated());
    }

    // ───────── 예약대기 ─────────

    @Test
    void waitlistCannotBeJoinedTwiceAndIsCanceledWhenReserving() throws Exception {
        joinWaitlist(bob, tomorrow, "13:00", 1)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.kind").value("WAITING"))
                .andExpect(jsonPath("$.chairIds.length()").value(0))
                .andExpect(jsonPath("$.notifiedAt").isEmpty());
        joinWaitlist(bob, tomorrow, "13:00", 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("WAITLIST_ALREADY_JOINED"));

        reserve(bob, tomorrow, "13:00", "B01-1").andExpect(status().isCreated());
        mvc.perform(get("/api/v1/seats/reservations/me").session(user(bob)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].kind").value("RESERVED"));
    }

    @Test
    void cancelNotifiesWaitlistOnlyWhenEnoughChairsAreFree() throws Exception {
        Long table = idOf(reserve(alice, tomorrow, "13:00", "T01-1", "T01-2").andExpect(status().isCreated()));
        Long bar = idOf(reserve(alice, tomorrow, "13:00", "B01-1").andExpect(status().isCreated()));
        joinWaitlist(bob, tomorrow, "13:00", 2).andExpect(status().isCreated());

        // 바석 1석만 풀리면 2명 대기에는 알리지 않는다
        mvc.perform(delete("/api/v1/seats/reservations/" + bar).with(csrf()).session(user(alice)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/seats/reservations/me").session(user(bob)))
                .andExpect(jsonPath("$[0].notifiedAt").isEmpty());

        // 테이블까지 풀려 3석이 비면 알린다
        mvc.perform(delete("/api/v1/seats/reservations/" + table).with(csrf()).session(user(alice)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/seats/reservations/me").session(user(bob)))
                .andExpect(jsonPath("$[0].kind").value("WAITING"))
                .andExpect(jsonPath("$[0].notifiedAt").isNotEmpty());
    }

    // ───────── 관리자 ─────────

    @Test
    void onlyAdminCanUseSeatAdminApis() throws Exception {
        mvc.perform(get("/api/v1/admin/branches/test/seats")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/branches/test/seats").session(user(alice))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/branches/test/seats").session(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("T01"))
                .andExpect(jsonPath("$[0].underRepair").value(false));
    }

    @Test
    void repairBlocksNewReservationsAndShowsAsRepair() throws Exception {
        mvc.perform(patch("/api/v1/admin/branches/test/seats/B01/repair").with(csrf()).session(admin())
                .contentType("application/json").content("{\"underRepair\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.underRepair").value(true));

        reserve(alice, tomorrow, "13:00", "B01-1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_UNDER_REPAIR"));
        mvc.perform(get("/api/v1/seats/status")
                .param("branchId", "test").param("date", tomorrow.toString()).param("start", "13:00"))
                .andExpect(content().json("{\"B01-1\":\"REPAIR\"}", JsonCompareMode.STRICT));
        mvc.perform(get("/api/v1/seats/availability").param("branchId", "test").param("date", tomorrow.toString()))
                .andExpect(jsonPath("$[4].available").value(2))
                .andExpect(jsonPath("$[4].total").value(3));

        mvc.perform(patch("/api/v1/admin/branches/test/seats/Z99/repair").with(csrf()).session(admin())
                .contentType("application/json").content("{\"underRepair\":true}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SEAT_NOT_FOUND"));
    }

    @Test
    void adminSeesReservationsOfTheDay() throws Exception {
        reserve(alice, tomorrow, "14:00", "T01-1").andExpect(status().isCreated());
        reserve(bob, tomorrow, "13:00", "B01-1").andExpect(status().isCreated());

        mvc.perform(get("/api/v1/admin/branches/test/seat-reservations").param("date", tomorrow.toString())
                .session(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].memberNickname").value("bob"))
                .andExpect(jsonPath("$[0].chairLabels[0]").value("B01"))
                .andExpect(jsonPath("$[1].memberNickname").value("alice"));
    }

    @Test
    void checkInOnlyAroundTheTimeAndOnlyOnce() throws Exception {
        // 오늘 하루 전체를 시간대로 잡아 지금이 언제든 방문 확인 가능한 시간이 되게 한다
        SeatReservation now = saveReservation(alice, today, LocalTime.MIN, LocalTime.of(23, 59, 59),
                SeatReservation.Status.ACTIVE);
        mvc.perform(patch("/api/v1/admin/seat-reservations/" + now.getId() + "/check-in").with(csrf()).session(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKED_IN"));
        mvc.perform(patch("/api/v1/admin/seat-reservations/" + now.getId() + "/check-in").with(csrf()).session(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_ACTIVE"));

        Long later = idOf(reserve(bob, tomorrow, "13:00", "T01-1").andExpect(status().isCreated()));
        mvc.perform(patch("/api/v1/admin/seat-reservations/" + later + "/check-in").with(csrf()).session(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHECK_IN_NOT_AVAILABLE"));
    }

    @Test
    void noShowOnlyAfterStartAndNotForWaitlist() throws Exception {
        SeatReservation past = saveReservation(alice, today.minusDays(1), LocalTime.of(13, 0), LocalTime.of(14, 0),
                SeatReservation.Status.ACTIVE);
        mvc.perform(patch("/api/v1/admin/seat-reservations/" + past.getId() + "/no-show").with(csrf()).session(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NO_SHOW"));

        Long later = idOf(reserve(bob, tomorrow, "13:00", "T01-1").andExpect(status().isCreated()));
        mvc.perform(patch("/api/v1/admin/seat-reservations/" + later + "/no-show").with(csrf()).session(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_SHOW_TOO_EARLY"));

        Long waiting = idOf(joinWaitlist(alice, tomorrow, "15:00", 1).andExpect(status().isCreated()));
        mvc.perform(patch("/api/v1/admin/seat-reservations/" + waiting + "/no-show").with(csrf()).session(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESERVATION_IS_WAITLIST"));
    }

    // ───────── 도우미 ─────────

    // 인원 = 고른 의자 수
    private ResultActions reserve(Member member, LocalDate date, String start, String... chairIds) throws Exception {
        return reserveFor(member, date, start, chairIds.length, chairIds);
    }

    private ResultActions reserveFor(Member member, LocalDate date, String start, int people, String... chairIds)
            throws Exception {
        return mvc.perform(post("/api/v1/seats/reservations").with(csrf()).session(user(member))
                .contentType("application/json")
                .content(reserveBody(date, start, people, chairIds)));
    }

    private ResultActions joinWaitlist(Member member, LocalDate date, String start, int people) throws Exception {
        return mvc.perform(post("/api/v1/seats/waitlist").with(csrf()).session(user(member))
                .contentType("application/json")
                .content("""
                        {"slot":{"branchId":"test","date":"%s","start":"%s"},"people":%d}
                        """.formatted(date, start, people)));
    }

    private static String reserveBody(LocalDate date, String start, String... chairIds) {
        return reserveBody(date, start, chairIds.length, chairIds);
    }

    private static String reserveBody(LocalDate date, String start, int people, String... chairIds) {
        String chairs = String.join(",", List.of(chairIds).stream().map(c -> "\"" + c + "\"").toList());
        return """
                {"slot":{"branchId":"test","date":"%s","start":"%s"},"people":%d,"chairIds":[%s]}
                """.formatted(date, start, people, chairs);
    }

    private static Long idOf(ResultActions result) throws Exception {
        Number id = JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    // 로그인한 회원 — 이름은 회원 번호 (AuthService.loginMemberNo)
    private static MockHttpSession user(Member member) {
        return session(String.valueOf(member.getNo()), "ROLE_USER");
    }

    // 본사 관리자 — 관리자 API가 회원 번호로 담당 지점을 확인하므로(BranchAdminService) 실제 ADMIN 회원이어야 한다
    private MockHttpSession admin() {
        return session(String.valueOf(admin.getNo()), "ROLE_ADMIN");
    }

    private static MockHttpSession session(String name, String role) {
        var authentication = new UsernamePasswordAuthenticationToken(name, "", List.of(new SimpleGrantedAuthority(role)));
        var session = new MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(authentication));
        return session;
    }

    private Branch saveBranch(String id, boolean open) {
        Branch b = new Branch();
        b.setId(id);
        b.setName("테스트점");
        b.setAddress("서울시");
        b.setOpen(open);
        return branches.saveAndFlush(b);
    }

    private void saveSeat(String code, Seat.Section section, Seat.Type type, int capacity, Set<Seat.Feature> features) {
        Seat seat = new Seat();
        seat.setBranch(branch);
        seat.setCode(code);
        seat.setSection(section);
        seat.setType(type);
        seat.setCapacity(capacity);
        seat.setX(10);
        seat.setY(10);
        seat.getFeatures().addAll(features);
        seats.saveAndFlush(seat);
    }

    private Member saveMember(String loginId) {
        Member member = new Member();
        member.setLoginId(loginId);
        member.setPassword("x");
        member.setNickname(loginId);
        return members.saveAndFlush(member);
    }

    // API로 만들 수 없는 지난 · 오늘 예약 (의자 없이)
    private SeatReservation saveReservation(Member member, LocalDate date, LocalTime start, LocalTime end,
            SeatReservation.Status status) {
        SeatReservation r = new SeatReservation();
        r.setMember(member);
        r.setBranch(branch);
        r.setDate(date);
        r.setStartTime(start);
        r.setEndTime(end);
        r.setPeople(1);
        r.setKind(SeatReservation.Kind.RESERVED);
        r.setStatus(status);
        return reservations.saveAndFlush(r);
    }
}
