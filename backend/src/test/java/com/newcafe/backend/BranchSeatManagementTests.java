package com.newcafe.backend;

import com.newcafe.backend.entity.*;
import com.newcafe.backend.repository.*;
import com.newcafe.backend.service.SeatSchedule;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql({"/branches_data.sql", "/menus_data.sql", "/seats_data.sql", "/admin.sql", "/branch_admins_data.sql"})
class BranchSeatManagementTests {
    @Autowired MockMvc mvc;
    @Autowired SeatRepository seats;
    @Autowired BranchRepository branches;
    @Autowired MemberRepository members;
    @Autowired SeatReservationRepository reservations;
    @Autowired BranchOperationLogRepository logs;
    @Autowired MenuRepository menus;
    @Autowired com.newcafe.backend.service.SeatService publicSeats;
    @Autowired com.newcafe.backend.service.SeatReservationService bookings;

    private MockHttpSession login(String branch) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                .content("{\"loginId\":\"test_" + branch + "_admin\",\"password\":\"branch-admin-pass\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private SeatReservation booking(int chairNo, int days) {
        var r = new SeatReservation();
        r.setBranch(branches.findById("mapo").orElseThrow());
        r.setMember(members.findByLoginIdAndDeletedFalse("e2eadmin").orElseThrow());
        r.setDate(SeatSchedule.now().toLocalDate().plusDays(days));
        r.setStartTime(LocalTime.of(9, 0)); r.setEndTime(LocalTime.of(10, 0));
        r.setPeople(1); r.setKind(SeatReservation.Kind.RESERVED);
        r.addChair(seats.findByBranchIdAndCode("mapo", "T01").orElseThrow(), chairNo);
        return reservations.saveAndFlush(r);
    }

    private org.springframework.test.web.servlet.ResultActions repair(MockHttpSession session, String suffix, String json) throws Exception {
        return mvc.perform(patch("/api/v1/admin/branches/mapo/seats/T01" + suffix).session(session).with(csrf())
                .contentType("application/json").content(json));
    }

    @Test void repairRequiresAcknowledgingAllUpcomingBookingsAndKeepsThemIntact() throws Exception {
        var session = login("mapo");
        var first = booking(1, 1);
        mvc.perform(get("/api/v1/admin/branches/mapo/seats/T01/repair-conflicts").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        // A booking added after the preview must require a fresh confirmation.
        var second = booking(2, 2);
        var canceled = booking(1, 3); canceled.setStatus(SeatReservation.Status.CANCELED);
        var past = booking(1, -1);
        mvc.perform(get("/api/v1/admin/branches/mapo/seats/T01/repair-conflicts").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].chairIds[0]").value("T01-1"));
        long before = logs.count();
        repair(session, "/repair", "{\"underRepair\":true}").andExpect(status().isConflict())
                .andExpect(jsonPath("code").value("REPAIR_RESERVATION_CONFIRMATION_REQUIRED"));
        repair(session, "/repair", "{\"underRepair\":true,\"acknowledgedReservationIds\":[" + first.getId() + "]}")
                .andExpect(status().isConflict());
        assertEquals(before, logs.count());
        assertFalse(seats.findByBranchIdAndCode("mapo", "T01").orElseThrow().isUnderRepair());
        repair(session, "/repair", "{\"underRepair\":true,\"acknowledgedReservationIds\":[" + first.getId() + "," + second.getId() + "]}")
                .andExpect(status().isOk());
        assertEquals(before + 1, logs.count());
        assertEquals(SeatReservation.Status.ACTIVE, first.getStatus());
        assertEquals(1, first.getChairs().size());
        assertNotNull(past.getId());
    }

    @Test void oneChairRepairExcludesOnlyThatChairFromAvailabilityAndBooking() throws Exception {
        var session = login("mapo");
        var reserved = booking(1, 1);
        var date = reserved.getDate();
        int initial = publicSeats.findAvailability("mapo", date).getFirst().available();
        repair(session, "/chairs/1/repair", "{\"underRepair\":true,\"acknowledgedReservationIds\":[" + reserved.getId() + "]}")
                .andExpect(status().isOk()).andExpect(jsonPath("repairChairNos[0]").value(1))
                .andExpect(jsonPath("underRepair").value(false));
        // The already reserved chair and its repair must be counted only once.
        assertEquals(initial, publicSeats.findAvailability("mapo", date).getFirst().available());
        var statuses = publicSeats.findChairStatuses("mapo", date, LocalTime.of(9, 0));
        assertEquals(com.newcafe.backend.dto.seat.ChairStatus.REPAIR, statuses.get("T01-1"));
        assertFalse(statuses.containsKey("T01-2"));
        var slot = new com.newcafe.backend.dto.seat.SeatSlotRequest("mapo", date, LocalTime.of(10, 0));
        long memberNo = reserved.getMember().getNo();
        assertThrows(com.newcafe.backend.common.exception.ConflictException.class, () -> bookings.reserve(memberNo,
                new com.newcafe.backend.dto.seat.SeatReservationRequest(slot, 1, List.of("T01-1"))));
        var good = bookings.reserve(memberNo, new com.newcafe.backend.dto.seat.SeatReservationRequest(slot, 1, List.of("T01-2")));
        assertNotNull(good.id());
        // Whole-table repair/unrepair preserves an individual chair's repair flag.
        repair(session, "/repair", "{\"underRepair\":true,\"acknowledgedReservationIds\":[" + reserved.getId() + "," + good.id() + "]}")
                .andExpect(status().isOk());
        repair(session, "/chairs/2/repair", "{\"underRepair\":false}").andExpect(status().isConflict());
        repair(session, "/repair", "{\"underRepair\":false}").andExpect(status().isOk())
                .andExpect(jsonPath("repairChairNos[0]").value(1));
        repair(session, "/chairs/1/repair", "{\"underRepair\":false}").andExpect(status().isOk())
                .andExpect(jsonPath("repairChairNos.length()").value(0));
    }

    @Test void invalidChairsAndOtherBranchesAreDeniedAndHistoryIsScoped() throws Exception {
        var session = login("mapo");
        repair(session, "/chairs/0/repair", "{\"underRepair\":true}").andExpect(status().isBadRequest());
        repair(session, "/chairs/999/repair", "{\"underRepair\":true}").andExpect(status().isBadRequest());
        for (String path : List.of("seats/T01/repair-conflicts", "operation-logs")) {
            mvc.perform(get("/api/v1/admin/branches/gangnam/" + path).session(session)).andExpect(status().isForbidden());
        }
        mvc.perform(patch("/api/v1/admin/branches/gangnam/seats/T01/chairs/1/repair").session(session).with(csrf())
                .contentType("application/json").content("{\"underRepair\":true}")).andExpect(status().isForbidden());
        repair(session, "/chairs/1/repair", "{\"underRepair\":true}").andExpect(status().isOk());
        long count = logs.count();
        repair(session, "/chairs/1/repair", "{\"underRepair\":true}").andExpect(status().isOk());
        assertEquals(count, logs.count(), "No-op requests must not create audit noise");
        mvc.perform(get("/api/v1/admin/branches/mapo/operation-logs").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].actorLoginId").value("test_mapo_admin"))
                .andExpect(jsonPath("$[0].target").value("T01-1"))
                .andExpect(jsonPath("$[0].beforeValue").value("false"))
                .andExpect(jsonPath("$[0].afterValue").value("true"));
        long menuId = menus.findAllByDeletedFalseOrderByIdAsc().getFirst().getId();
        mvc.perform(patch("/api/v1/admin/branches/mapo/menus/" + menuId + "/status").session(session).with(csrf())
                .contentType("application/json").content("{\"status\":\"HIDDEN\"}")).andExpect(status().isOk());
        assertTrue(logs.findAll().stream().anyMatch(l -> l.getAction().equals("MENU_STATUS") && l.getTarget().equals("" + menuId)));
    }
}
