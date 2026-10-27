package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.newcafe.backend.entity.Member;
import com.newcafe.backend.repository.CouponLogRepository;
import com.newcafe.backend.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MemberApiTests {
    @Autowired MockMvc mvc;
    @Autowired MemberRepository members;
    @Autowired CouponLogRepository couponLogs;
    @jakarta.persistence.PersistenceContext jakarta.persistence.EntityManager entityManager;

    // 가입 축하 쿠폰 내역(coupons_log)이 회원을 참조하므로 회원보다 먼저 지운다.
    @BeforeEach void clean() { couponLogs.deleteAll(); members.deleteAll(); }

    private void signup(String id) throws Exception {
        mvc.perform(post("/api/v1/auth/signup").with(csrf()).contentType("application/json")
                .content("""
                    {"loginId":"%s","password":"password123","nickname":"Tester"}
                    """.formatted(id)))
                .andExpect(status().isCreated()).andExpect(jsonPath("password").doesNotExist())
                .andExpect(jsonPath("gradeId").isEmpty());
    }

    private MockHttpSession login(String id, String password) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType("application/json").content("""
                    {"loginId":"%s","password":"%s"}
                    """.formatted(id, password)))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    @Test void signupLoginOwnerAndLogout() throws Exception {
        signup("alice");
        signup("bobby");
        var alice = members.findByLoginIdAndDeletedFalse("alice").orElseThrow();
        assertNotEquals("password123", alice.getPassword());
        var session = login("alice", "password123");
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/me/" + alice.getNo()).session(session).with(csrf())
                .contentType("application/json").content("{\"nickname\":\"Updated\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("nickname").value("Updated"));
        var bob = members.findByLoginIdAndDeletedFalse("bobby").orElseThrow();
        mvc.perform(get("/api/v1/me/" + bob.getNo()).session(session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void passwordChangeRevokesOtherSessions() throws Exception {
        signup("alice");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        var first = login("alice", "password123");
        var other = login("alice", "password123");
        mvc.perform(patch("/api/v1/me/" + no + "/password").session(first).with(csrf())
                .contentType("application/json")
                .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"newpassword123\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/me/" + no + "/password").session(first).with(csrf())
                .contentType("application/json")
                .content("{\"currentPassword\":\"password123\",\"newPassword\":\"newpassword123\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").session(other)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                .content("{\"loginId\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
        login("alice", "newpassword123");
    }

    @Test void withdrawalMasksProfileAndRevokesOtherSessions() throws Exception {
        signup("alice");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        var first = login("alice", "password123");
        var other = login("alice", "password123");
        mvc.perform(delete("/api/v1/me/" + no).session(first).with(csrf())
                .contentType("application/json").content("{\"password\":\"password123\"}"))
                .andExpect(status().isNoContent());
        var withdrawn = members.findById(no).orElseThrow();
        assertTrue(withdrawn.isDeleted());
        assertEquals("deleted#" + no, withdrawn.getLoginId());
        assertEquals("", withdrawn.getPassword());
        assertNull(withdrawn.getEmail());
        mvc.perform(get("/api/v1/auth/me").session(other)).andExpect(status().isUnauthorized());
        signup("alice");
    }

    @Test void validationAndCsrf() throws Exception {
        mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk())
                .andExpect(jsonPath("token").isNotEmpty());
        mvc.perform(post("/api/v1/auth/signup").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        signup("alice");
        mvc.perform(post("/api/v1/auth/signup").with(csrf()).contentType("application/json")
                .content("{\"loginId\":\"alice\",\"password\":\"password123\",\"nickname\":\"Test\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/auth/signup").with(csrf()).contentType("application/json")
                .content("{\"loginId\":\"bobby\",\"password\":\"" + "가".repeat(25) + "\",\"nickname\":\"Test\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void realCsrfTokenWorksAcrossLoginAndRejectsMissingToken() throws Exception {
        signup("alice");
        var tokenResult = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(tokenResult.getResponse().getContentAsString(), "$.token");
        var session = (MockHttpSession) tokenResult.getRequest().getSession(false);
        String previousSessionId = session.getId();
        var loginResult = mvc.perform(post("/api/v1/auth/login").session(session)
                .header("X-CSRF-TOKEN", token).contentType("application/json")
                .content("{\"loginId\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn();
        session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertNotEquals(previousSessionId, session.getId());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/logout").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").session(session).header("X-CSRF-TOKEN", token))
                .andExpect(status().isForbidden());
        tokenResult = mvc.perform(get("/api/v1/auth/csrf").session(session)).andReturn();
        token = com.jayway.jsonpath.JsonPath.read(tokenResult.getResponse().getContentAsString(), "$.token");
        mvc.perform(post("/api/v1/auth/logout").session(session).header("X-CSRF-TOKEN", token))
                .andExpect(status().isNoContent());
    }

    @Test void adminCanManageMembersAndDeletionRevokesSession() throws Exception {
        signup("admin");
        var admin = members.findByLoginIdAndDeletedFalse("admin").orElseThrow();
        admin.setRole(Member.Role.ADMIN);
        members.save(admin);
        var session = login("admin", "password123");
        mvc.perform(post("/api/v1/admin/members/create").session(session).with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"alice\",\"password\":\"password123\",\"nickname\":\"Test\"}"))
                .andExpect(status().isCreated());
        var userSession = login("alice", "password123");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/members/" + no).session(session)).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/admin/members/" + no).session(session).with(csrf())
                .contentType("application/json").content("{\"nickname\":\"Changed\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("nickname").value("Changed"));
        mvc.perform(delete("/api/v1/admin/members/" + no).session(session).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").session(userSession)).andExpect(status().isUnauthorized());
    }

    @Test void headOfficeAdminCanManageMembers() throws Exception {
        signup("headadmin");
        var admin = members.findByLoginIdAndDeletedFalse("headadmin").orElseThrow();
        admin.setRole(Member.Role.HQ_ADMIN);
        members.save(admin);
        var session = login("headadmin", "password123");
        mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/members/create").session(session).with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"newuser\",\"password\":\"password123\",\"nickname\":\"New\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("role").value("USER"));
    }

    @Test void branchAdminCannotAccessHeadOfficeApis() throws Exception {
        signup("branchadmin");
        var admin = members.findByLoginIdAndDeletedFalse("branchadmin").orElseThrow();
        admin.setRole(Member.Role.BRANCH_ADMIN);
        members.save(admin);
        var session = login("branchadmin", "password123");
        mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/members/" + admin.getNo()).session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("password").doesNotExist());
        mvc.perform(post("/api/v1/admin/members/create").session(session).with(csrf())
                .contentType("application/json")
                .content("{\"loginId\":\"blocked\",\"password\":\"password123\",\"nickname\":\"Blocked\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/admin/members/" + admin.getNo()).session(session).with(csrf())
                .contentType("application/json").content("{\"nickname\":\"Blocked\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/admin/members/" + admin.getNo()).session(session).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/races").session(session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/horses").session(session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/menus").session(session)).andExpect(status().isForbidden());
    }

    @Test void changingAdminRoleRevokesExistingSession() throws Exception {
        signup("roleadmin");
        var admin = members.findByLoginIdAndDeletedFalse("roleadmin").orElseThrow();
        admin.setRole(Member.Role.HQ_ADMIN);
        members.save(admin);
        var previous = login("roleadmin", "password123");
        admin.setRole(Member.Role.BRANCH_ADMIN);
        members.save(admin);
        mvc.perform(get("/api/v1/admin/members").session(previous)).andExpect(status().isUnauthorized());
        var current = login("roleadmin", "password123");
        mvc.perform(get("/api/v1/admin/members").session(current)).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/admin/members/" + admin.getNo()).session(current).with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test void invalidProfileDoesNotChangeStoredData() throws Exception {
        signup("alice");
        var session = login("alice", "password123");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        String[] invalidProfiles = {
                "{\"nickname\":\"   \"}", "{\"email\":\"invalid\"}",
                "{\"gender\":\"X\"}", "{\"birth\":\"2999-01-01\"}",
                "{\"phoneNumber\":\"" + "1".repeat(21) + "\"}",
                "{\"address1\":\"" + "a".repeat(256) + "\"}"
        };
        for (String profile : invalidProfiles) {
            mvc.perform(patch("/api/v1/me/" + no).session(session).with(csrf())
                    .contentType("application/json").content(profile)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/me/" + no).session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("nickname").value("Tester"))
                .andExpect(jsonPath("email").isEmpty());
    }

    @Test void profilePatchPreservesOmittedFieldsAndClearsEmptyFields() throws Exception {
        signup("alice");
        var session = login("alice", "password123");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        mvc.perform(patch("/api/v1/me/" + no).session(session).with(csrf()).contentType("application/json")
                .content("{\"email\":\" alice@example.com \",\"address1\":\" Seoul \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("email").value("alice@example.com"));
        mvc.perform(patch("/api/v1/me/" + no).session(session).with(csrf()).contentType("application/json")
                .content("{\"email\":\"\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("email").isEmpty())
                .andExpect(jsonPath("address1").value("Seoul"))
                .andExpect(jsonPath("nickname").value("Tester"));
    }

    @Test void wrongWithdrawalPasswordPreservesAccountAndSession() throws Exception {
        signup("alice");
        var session = login("alice", "password123");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        mvc.perform(delete("/api/v1/me/" + no).session(session).with(csrf()).contentType("application/json")
                .content("{\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("code").value("PASSWORD_MISMATCH"));
        assertFalse(members.findById(no).orElseThrow().isDeleted());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk());
    }

    @Test void invalidNewPasswordPreservesOldPasswordAndSession() throws Exception {
        signup("alice");
        var session = login("alice", "password123");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        mvc.perform(patch("/api/v1/me/" + no + "/password").session(session).with(csrf())
                .contentType("application/json")
                .content("{\"currentPassword\":\"password123\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk());
        login("alice", "password123");
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void gradeForeignKeyPersistsAndAppearsInMemberResponse() throws Exception {
        signup("alice");
        // 테스트 전용 등급이며 운영 등급 정책이나 초기 데이터로 등록하지 않는다.
        var grade = new com.newcafe.backend.entity.Grade();
        grade.setName("TEST_GRADE");
        grade.setMinTotalCoupons(10);
        entityManager.persist(grade);
        var member = members.findByLoginIdAndDeletedFalse("alice").orElseThrow();
        member.setGrade(grade);
        entityManager.flush();
        entityManager.clear();
        Number storedGradeId = (Number) entityManager.createNativeQuery(
                "select grade_id from members where no = :no")
                .setParameter("no", member.getNo()).getSingleResult();
        assertEquals(grade.getId().intValue(), storedGradeId.intValue());
        var session = login("alice", "password123");
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("gradeId").value(grade.getId()));
    }

    @Test void signupCannotAssignRoleGradeOrWallet() throws Exception {
        mvc.perform(post("/api/v1/auth/signup").with(csrf()).contentType("application/json")
                .content("""
                    {"loginId":"alice","password":"password123","nickname":"Tester",
                     "role":"ADMIN","gradeId":999,"couponCount":999,"loseStreak":999,"deleted":true}
                    """))
                .andExpect(status().isCreated()).andExpect(jsonPath("role").value("USER"))
                .andExpect(jsonPath("gradeId").isEmpty()).andExpect(jsonPath("couponCount").value(5))
                .andExpect(jsonPath("loseStreak").value(0));
        assertFalse(members.findByLoginIdAndDeletedFalse("alice").orElseThrow().isDeleted());
        var session = login("alice", "password123");
        mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isForbidden());
    }

    @Test void profileCannotChangeIdentityRoleGradeOrWallet() throws Exception {
        signup("alice");
        var session = login("alice", "password123");
        long no = members.findByLoginIdAndDeletedFalse("alice").orElseThrow().getNo();
        mvc.perform(patch("/api/v1/me/" + no).session(session).with(csrf()).contentType("application/json")
                .content("""
                    {"nickname":"Updated","loginId":"hacked","password":"hacked123",
                     "role":"ADMIN","gradeId":999,"couponCount":999,"loseStreak":999,"deleted":true}
                    """))
                .andExpect(status().isOk()).andExpect(jsonPath("loginId").value("alice"))
                .andExpect(jsonPath("role").value("USER")).andExpect(jsonPath("gradeId").isEmpty())
                .andExpect(jsonPath("couponCount").value(5)).andExpect(jsonPath("loseStreak").value(0));
        login("alice", "password123");
        mvc.perform(get("/api/v1/admin/members").session(session)).andExpect(status().isForbidden());
    }
}
