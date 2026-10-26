package com.newcafe.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
}
