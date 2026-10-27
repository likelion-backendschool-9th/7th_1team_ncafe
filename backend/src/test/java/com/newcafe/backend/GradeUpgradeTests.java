package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.newcafe.backend.entity.Grade;
import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.GradeRepository;
import com.newcafe.backend.repository.MemberRepository;
import com.newcafe.backend.service.CouponService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

// 회원 등급 — 지금까지 받은 쿠폰 수(누적)로 매기고, 쿠폰을 써도 누적 · 등급은 줄지 않는다. 가입 축하 쿠폰 5장도 누적에 든다.
@SpringBootTest
@Transactional
@TestPropertySource(properties = "spring.sql.init.mode=never")
class GradeUpgradeTests {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired CouponService couponService;
    @Autowired MemberRepository members;
    @Autowired GradeRepository grades;
    @PersistenceContext EntityManager entityManager;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    @Test
    void withoutGradeDataMemberHasNoGrade() throws Exception {
        long no = signup("alice");
        Member alice = reload(no);
        assertEquals(5, alice.getTotalEarnedCoupons()); // 가입 축하 쿠폰
        assertNull(alice.getGrade());
    }

    @Test
    void climbsGradesByTotalEarnedAndNeverDrops() throws Exception {
        saveGrades();
        long no = signup("alice");
        assertEquals("신마", reload(no).getGrade().getName()); // 누적 5

        couponService.earn(no, 5, "주문 적립");
        assertEquals("준마", reload(no).getGrade().getName()); // 누적 10

        couponService.spend(no, 8, "레이스 참가"); // 보유는 줄지만 누적 · 등급은 그대로
        Member afterSpend = reload(no);
        assertEquals(2, afterSpend.getCouponCount());
        assertEquals(10, afterSpend.getTotalEarnedCoupons());
        assertEquals("준마", afterSpend.getGrade().getName());

        couponService.earn(no, 14, "레이스 보상");
        assertEquals("준마", reload(no).getGrade().getName()); // 누적 24 — 명마(25) 바로 아래
        couponService.earn(no, 1, "연패 위로");
        assertEquals("명마", reload(no).getGrade().getName()); // 누적 25

        couponService.earn(no, 100, "이벤트");
        Member legend = reload(no);
        assertEquals("전설마", legend.getGrade().getName());
        assertEquals(125, legend.getTotalEarnedCoupons());
    }

    @Test
    void meShowsGradeAndTotalEarned() throws Exception {
        saveGrades();
        long no = signup("alice");
        couponService.earn(no, 5, "주문 적립");
        Integer junma = reload(no).getGrade().getId();

        mvc.perform(get("/api/v1/auth/me").session(login("alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gradeId").value(junma))
                .andExpect(jsonPath("$.totalEarnedCoupons").value(10));
    }

    // ───────── 도우미 ─────────

    private void saveGrades() {
        saveGrade("신마", 0);
        saveGrade("준마", 10);
        saveGrade("명마", 25);
        saveGrade("전설마", 40);
    }

    private void saveGrade(String name, int minTotalCoupons) {
        Grade grade = new Grade();
        grade.setName(name);
        grade.setMinTotalCoupons(minTotalCoupons);
        grades.saveAndFlush(grade);
    }

    private Member reload(long no) {
        entityManager.flush();
        entityManager.clear();
        return members.findByNoAndDeletedFalse(no).orElseThrow();
    }

    private long signup(String id) throws Exception {
        mvc.perform(post("/api/v1/auth/signup").with(csrf()).contentType("application/json")
                        .content("{\"loginId\":\"%s\",\"password\":\"password123\",\"nickname\":\"Tester\"}".formatted(id)))
                .andExpect(status().isCreated());
        return members.findByLoginIdAndDeletedFalse(id).orElseThrow().getNo();
    }

    private MockHttpSession login(String id) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                        .content("{\"loginId\":\"%s\",\"password\":\"password123\"}".formatted(id)))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }
}
