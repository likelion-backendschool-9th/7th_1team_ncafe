package com.newcafe.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.newcafe.backend.entity.Member;
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

    @BeforeEach void clean() { members.deleteAll(); }

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
        var loginResult = mvc.perform(post("/api/v1/auth/login").session(session)
                .header("X-CSRF-TOKEN", token).contentType("application/json")
                .content("{\"loginId\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn();
        session = (MockHttpSession) loginResult.getRequest().getSession(false);
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/logout").session(session)).andExpect(status().isForbidden());
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
}
