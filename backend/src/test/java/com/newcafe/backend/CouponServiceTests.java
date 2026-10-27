package com.newcafe.backend;

import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.repository.CouponLogRepository;
import com.newcafe.backend.service.CouponService;
import com.newcafe.backend.common.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class CouponServiceTests {
    @Autowired MemberRepository members;
    @Autowired CouponLogRepository logs;
    @Autowired CouponService coupons;

    private Long member(String loginId, int balance, int streak, boolean deleted) {
        var member = new Member();
        member.setLoginId(loginId);
        member.setNickname("Tester");
        member.setPassword("not-for-login");
        member.setCouponCount(balance);
        member.setLoseStreak(streak);
        member.setDeleted(deleted);
        return members.saveAndFlush(member).getNo();
    }

    @Test void earnAndSpendPersistBalanceAndLogsAndRejectOverspending() {
        Long no = member("coupon_test", 0, 0, false);
        coupons.earn(no, 3, "test earn");
        coupons.spend(no, 2, "test spend");
        assertEquals(1, members.findById(no).orElseThrow().getCouponCount());
        var history = logs.findAllByMemberNoOrderByCreatedDateDescIdDesc(no);
        assertEquals(2, history.size());
        assertEquals(1, history.stream().mapToInt(log -> log.getDelta()).sum());
        assertThrows(ConflictException.class, () -> coupons.spend(no, 2, "insufficient"));
        assertEquals(1, members.findById(no).orElseThrow().getCouponCount());
        assertEquals(2, logs.findAllByMemberNoOrderByCreatedDateDescIdDesc(no).size());
    }

    @Test void losingStreakQuerySelectsOnlyActiveMembersWithEmptyWallets() {
        Long eligible = member("eligible_test", 0, 3, false);
        member("funded_test", 1, 3, false);
        member("new_test", 0, 2, false);
        Long deleted = member("deleted_test", 0, 3, true);
        assertEquals(java.util.List.of(eligible), members
                .findAllByLoseStreakGreaterThanEqualAndCouponCountAndDeletedFalse(3, 0).stream().map(Member::getNo).toList());
        assertEquals(0, members.increaseCoupons(deleted, 1));
        assertEquals(0, members.decreaseCoupons(deleted, 1));
    }
}
