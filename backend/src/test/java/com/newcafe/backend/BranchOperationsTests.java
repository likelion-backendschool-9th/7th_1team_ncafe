package com.newcafe.backend;

import com.newcafe.backend.entity.*;
import com.newcafe.backend.repository.*;
import com.newcafe.backend.service.SeatSchedule;
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
class BranchOperationsTests {
    @Autowired MockMvc mvc;
    @Autowired MenuRepository menus;
    @Autowired SeatRepository seats;
    @Autowired BranchRepository branches;
    @Autowired MemberRepository members;
    @Autowired BranchAdminRepository assignments;
    @Autowired SeatReservationRepository reservations;

    private MockHttpSession login(String id, String password) throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                .content("{\"loginId\":\""+id+"\",\"password\":\""+password+"\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    @Test void threeFixedAccountsCanOnlyOperateTheirAssignedBranch() throws Exception {
        long menuId=menus.findAllByDeletedFalseOrderByIdAsc().getFirst().getId();
        for (String own : java.util.List.of("mapo","gangnam","seongsu")) {
            var session=login("test_"+own+"_admin","branch-admin-pass");
            mvc.perform(get("/api/v1/branch-admin/branches").session(session))
                    .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(own));
            for(String target:java.util.List.of("mapo","gangnam","seongsu")) {
                String base="/api/v1/admin/branches/"+target;
                var seat=seats.findAllByBranchIdOrderByIdAsc(target).getFirst();
                if(!target.equals(own)) {
                    mvc.perform(get(base+"/menus").session(session)).andExpect(status().isForbidden());
                    mvc.perform(get(base+"/seats").session(session)).andExpect(status().isForbidden());
                    mvc.perform(get(base+"/seat-reservations?date=2026-10-27").session(session)).andExpect(status().isForbidden());
                    mvc.perform(patch(base+"/menus/"+menuId+"/status").session(session).with(csrf()).contentType("application/json").content("{\"status\":\"HIDDEN\"}")).andExpect(status().isForbidden());
                    mvc.perform(patch(base+"/seats/"+seat.getCode()+"/repair").session(session).with(csrf()).contentType("application/json").content("{\"underRepair\":true}")).andExpect(status().isForbidden());
                } else {
                    mvc.perform(get(base+"/menus").session(session)).andExpect(status().isOk());
                    mvc.perform(get(base+"/seats").session(session)).andExpect(status().isOk());
                    mvc.perform(get(base+"/seat-reservations?date=2026-10-27").session(session)).andExpect(status().isOk());
                    for(String state: java.util.List.of("SOLD_OUT","HIDDEN","ON_SALE")) {
                        mvc.perform(patch(base+"/menus/"+menuId+"/status").session(session).with(csrf()).contentType("application/json").content("{\"status\":\""+state+"\"}"))
                                .andExpect(status().isOk()).andExpect(jsonPath("status").value(state));
                    }
                    mvc.perform(patch(base+"/seats/"+seat.getCode()+"/repair").session(session).with(csrf()).contentType("application/json").content("{\"underRepair\":true}"))
                            .andExpect(status().isOk()).andExpect(jsonPath("underRepair").value(true));
                    mvc.perform(patch(base+"/seats/"+seat.getCode()+"/repair").session(session).with(csrf()).contentType("application/json").content("{\"underRepair\":false}"))
                            .andExpect(status().isOk()).andExpect(jsonPath("underRepair").value(false));
                }
            }
            mvc.perform(get("/api/v1/admin/menus").session(session)).andExpect(status().isForbidden());
            mvc.perform(put("/api/v1/admin/branches/mapo/admins/1").session(session).with(csrf())).andExpect(status().isForbidden());
        }
    }

    private Long reservation(String branchId) {
        var now=SeatSchedule.now();
        var r=new SeatReservation(); r.setBranch(branches.findById(branchId).orElseThrow());
        r.setMember(members.findByLoginIdAndDeletedFalse("e2eadmin").orElseThrow());
        r.setDate(now.toLocalDate());r.setStartTime(now.toLocalTime().minusMinutes(5));r.setEndTime(now.toLocalTime().plusMinutes(30));
        r.setKind(SeatReservation.Kind.RESERVED);r.setPeople(1);
        return reservations.saveAndFlush(r).getId();
    }

    @Test void reservationIdsCannotBypassBranchChecksAndRevocationTakesEffect() throws Exception {
        var session=login("test_mapo_admin","branch-admin-pass");
        Long other=reservation("gangnam");
        for(String action:java.util.List.of("check-in","no-show")) {
            mvc.perform(patch("/api/v1/admin/seat-reservations/"+other+"/"+action).session(session).with(csrf())).andExpect(status().isForbidden());
        }
        Long own=reservation("mapo");
        mvc.perform(patch("/api/v1/admin/seat-reservations/"+own+"/check-in").session(session).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("status").value("CHECKED_IN"));
        Long noShow=reservation("mapo");
        mvc.perform(patch("/api/v1/admin/seat-reservations/"+noShow+"/no-show").session(session).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("status").value("NO_SHOW"));
        long no=members.findByLoginIdAndDeletedFalse("test_mapo_admin").orElseThrow().getNo();
        assignments.deleteById(new BranchAdminId("mapo",no));assignments.flush();
        mvc.perform(get("/api/v1/admin/branches/mapo/seats").session(session)).andExpect(status().isForbidden());
        var hq=login("e2eadmin","e2e-admin-pass");
        for(String branch:java.util.List.of("mapo","gangnam","seongsu")) {
            mvc.perform(get("/api/v1/admin/branches/"+branch+"/seats").session(hq)).andExpect(status().isOk());
        }
    }
}
