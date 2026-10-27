package com.newcafe.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.repository.BranchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Transactional
class BranchApiTests {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired BranchRepository repository;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain).build();
        repository.deleteAll();
    }

    @Test
    void anonymousUserCanReadEmptyList() throws Exception {
        mvc.perform(get("/api/v1/branches"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void anonymousUserCanReadSortedBranchesAndDetail() throws Exception {
        save("mapo", true);
        save("gangnam", false);
        mvc.perform(get("/api/v1/branches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("gangnam"))
                .andExpect(jsonPath("$[0].open").value(false));
        mvc.perform(get("/api/v1/branches/mapo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("mapo"))
                .andExpect(jsonPath("$.name").value("테스트 지점"))
                .andExpect(jsonPath("$.open").value(true))
                .andExpect(jsonPath("$.sections").value("[]"))
                .andExpect(jsonPath("$.createdDate").exists());
    }

    @Test
    void missingBranchReturns404() throws Exception {
        mvc.perform(get("/api/v1/branches/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BRANCH_NOT_FOUND"));
    }

    private void save(String id, boolean open) {
        Branch branch = new Branch();
        branch.setId(id);
        branch.setName("테스트 지점");
        branch.setAddress("서울시");
        branch.setSections("[]");
        branch.setFixtures("[]");
        branch.setOpen(open);
        repository.saveAndFlush(branch);
    }

    private org.springframework.mock.web.MockHttpSession session(String role) {
        var authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "test", "", java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)));
        var session = new org.springframework.mock.web.MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT",
                new org.springframework.security.core.context.SecurityContextImpl(authentication));
        return session;
    }

    private static final String CREATE = """
            {"id":"mapo","name":" 마포점 ","address":" 서울시 ","open":true}
            """;

    @Test
    void onlyAdminCanCreateBranch() throws Exception {
        mvc.perform(post("/api/v1/admin/branches").contentType("application/json").content(CREATE))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/branches").session(session("ROLE_USER"))
                .contentType("application/json").content(CREATE)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/branches/mapo").contentType("application/json").content(CREATE))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/admin/branches/mapo").session(session("ROLE_USER"))
                .contentType("application/json").content(CREATE)).andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateAndUpdateWithoutChangingIdOrCreationDate() throws Exception {
        mvc.perform(post("/api/v1/admin/branches").session(session("ROLE_ADMIN"))
                .contentType("application/json").content(CREATE))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("마포점"))
                .andExpect(jsonPath("$.sections").value("[]"));
        var createdDate = repository.findById("mapo").orElseThrow().getCreatedDate();
        mvc.perform(put("/api/v1/admin/branches/mapo").session(session("ROLE_ADMIN"))
                .contentType("application/json").content("""
                    {"name":"마포 본점","address":"서울 마포구","open":false,
                     "sections":"[{\\\"section\\\":\\\"LOUNGE\\\"}]","fixtures":"[]"}
                    """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.open").value(false));
        repository.flush();
        var branch = repository.findById("mapo").orElseThrow();
        assertEquals("마포 본점", branch.getName());
        assertEquals(createdDate, branch.getCreatedDate());
        assertEquals("mapo", branch.getId());
    }

    @Test
    void rejectsDuplicateMissingAndInvalidBranches() throws Exception {
        save("mapo", true);
        mvc.perform(post("/api/v1/admin/branches").session(session("ROLE_ADMIN"))
                .contentType("application/json").content(CREATE))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BRANCH_ID_DUPLICATED"));
        mvc.perform(put("/api/v1/admin/branches/missing").session(session("ROLE_ADMIN"))
                .contentType("application/json").content(CREATE)).andExpect(status().isNotFound());
        for (String invalid : java.util.List.of(
                "{\"id\":\"new\",\"name\":\" \",\"address\":\"서울\",\"open\":true}",
                "{\"id\":\"new\",\"name\":\"신규점\",\"address\":\"서울\"}",
                "{\"id\":\"new\",\"name\":\"신규점\",\"address\":\"서울\",\"open\":true,\"sections\":\"invalid\"}",
                "{\"id\":\"new\",\"name\":\"신규점\",\"address\":\"서울\",\"open\":true,\"fixtures\":\"{}\"}")) {
            mvc.perform(post("/api/v1/admin/branches").session(session("ROLE_ADMIN"))
                    .contentType("application/json").content(invalid)).andExpect(status().isBadRequest());
        }
        assertEquals(1, repository.count());
    }
}
