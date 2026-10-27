package com.newcafe.backend;

import com.newcafe.backend.config.H2SeatDemoData;
import com.newcafe.backend.entity.SeatReservation;
import com.newcafe.backend.repository.*;
import com.newcafe.backend.service.SeatSchedule;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.sql.init.mode=never")
@ActiveProfiles("h2")
@Transactional
@Sql({"/branches_data.sql", "/seats_data.sql"})
class H2SeatDemoDataTests {
    @Autowired H2SeatDemoData seed;
    @Autowired SeatReservationRepository reservations;
    @Autowired ReservedChairRepository chairs;
    @Autowired MemberRepository members;

    @Test void restartSeedFillsThreeBranchesWithoutDuplicatingOrUndoingChanges() {
        var args = new DefaultApplicationArguments(new String[0]);
        seed.run(args);
        var date = SeatSchedule.now().toLocalDate().plusDays(1);
        for (String branch : java.util.List.of("mapo", "gangnam", "seongsu")) {
            int count = chairs.findAllBySeatBranchIdAndDateAndStartTime(branch, date, java.time.LocalTime.of(9, 0)).size();
            assertTrue(count > 71 / 2, branch + " must be more than half full");
        }
        long reservationCount = reservations.count(), chairCount = chairs.count(), memberCount = members.count();
        seed.run(args);
        assertEquals(reservationCount, reservations.count());
        assertEquals(chairCount, chairs.count());
        assertEquals(memberCount, members.count());
        var canceled = reservations.findAll().getFirst();
        canceled.setStatus(SeatReservation.Status.CANCELED);
        canceled.getChairs().clear();
        reservations.flush();
        long afterCancel = chairs.count();
        seed.run(args);
        assertEquals(afterCancel, chairs.count());
        assertEquals(SeatReservation.Status.CANCELED, canceled.getStatus());
        assertTrue(members.findByLoginIdAndDeletedFalse("sd_mapo_1").orElseThrow().getRole() == com.newcafe.backend.entity.Member.Role.USER);
    }
}
