package com.newcafe.backend;

import com.newcafe.backend.entity.*;
import com.newcafe.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BranchAdminApiTests {
    @Autowired MockMvc mvc;
    @Autowired MemberRepository members;
    @Autowired BranchRepository branches;
    @Autowired BranchAdminRepository assignments;

    private Member member(String id, Member.Role role) {
        var member = new Member(); member.setLoginId(id); member.setNickname(id);
        member.setPassword("test-only"); member.setRole(role); return members.saveAndFlush(member);
    }
    private void branch(String id) {
        var branch = new Branch(); branch.setId(id); branch.setName(id); branch.setAddress("Test"); branches.saveAndFlush(branch);
    }
    private org.springframework.security.core.Authentication auth(Member member) {
        return new UsernamePasswordAuthenticationToken(member.getNo().toString(), "", java.util.List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole().name())));
    }

    @Test void multipleManagersAndBranchesWithImmediateRevocation() throws Exception {
        var hq=member("mapping_hq",Member.Role.HQ_ADMIN);
        var first=member("mapping_first",Member.Role.BRANCH_ADMIN);
        var second=member("mapping_second",Member.Role.BRANCH_ADMIN);
        branch("mapping_a"); branch("mapping_b");
        for (var target : java.util.List.of(first, second)) {
            mvc.perform(put("/api/v1/admin/branches/mapping_a/admins/"+target.getNo()).with(authentication(auth(hq))).with(csrf()))
                    .andExpect(status().isOk());
        }
        mvc.perform(put("/api/v1/admin/branches/mapping_a/admins/"+first.getNo()).with(authentication(auth(hq))).with(csrf())).andExpect(status().isOk());
        assertEquals(2,assignments.count());
        mvc.perform(get("/api/v1/branch-admin/branches/mapping_b").with(authentication(auth(first)))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/branches/mapping_b/admins/"+first.getNo()).with(authentication(auth(hq))).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/branch-admin/branches").with(authentication(auth(first)))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/branch-admin/branches/mapping_a").with(authentication(auth(first)))).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/admin/branches/mapping_a/admins/"+first.getNo()).with(authentication(auth(hq))).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/branch-admin/branches/mapping_a").with(authentication(auth(first)))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/branch-admin/branches/mapping_a").with(authentication(auth(second)))).andExpect(status().isOk());
        second.setRole(Member.Role.USER);members.saveAndFlush(second);
        mvc.perform(get("/api/v1/branch-admin/branches/mapping_a").with(authentication(auth(second)))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/branches/mapping_a/admins").with(authentication(auth(hq)))).andExpect(jsonPath("$.length()").value(0));
    }

    @Test void assignmentIsHeadOfficeOnlyAndDoesNotPromoteOrdinaryMembers() throws Exception {
        var hq=member("assignment_hq",Member.Role.ADMIN);
        var manager=member("assignment_manager",Member.Role.BRANCH_ADMIN);
        var user=member("assignment_user",Member.Role.USER);
        branch("assignment_a");
        var url="/api/v1/admin/branches/assignment_a/admins/"+manager.getNo();
        mvc.perform(put(url).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(put(url).with(authentication(auth(manager))).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(put(url).with(authentication(auth(hq)))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/branches/assignment_a/admins/"+user.getNo()).with(authentication(auth(hq))).with(csrf())).andExpect(status().isBadRequest());
        manager.setDeleted(true);members.saveAndFlush(manager);
        mvc.perform(put(url).with(authentication(auth(hq))).with(csrf())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/branch-admin/branches").with(authentication(auth(user)))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/branch-admin/branches/missing").with(authentication(auth(hq)))).andExpect(status().isNotFound());
        assertEquals(0,assignments.count());
    }
}
