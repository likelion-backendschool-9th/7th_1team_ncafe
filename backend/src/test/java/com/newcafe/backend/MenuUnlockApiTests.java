package com.newcafe.backend;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;
import com.newcafe.backend.entity.Grade;
import com.newcafe.backend.repository.GradeRepository;

// 회원 등급 목록 · 메뉴 해금 등급.
// 각자의 application.yml이 초기 데이터(*_data.sql)를 넣더라도 영향받지 않도록 이 테스트에서는 초기 데이터를 끈다.
@SpringBootTest
@Transactional
@TestPropertySource(properties = "spring.sql.init.mode=never")
class MenuUnlockApiTests {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired GradeRepository grades;
    private MockMvc mvc;

    private static final String SIZES = """
            [{"size":"S","price":4000},{"size":"M","price":4500},{"size":"L","price":5000},{"size":"XL","price":5500}]""";

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    @Test
    void gradesNeedLoginAndComeLowestFirst() throws Exception {
        saveGrade("명마", 25);
        saveGrade("신마", 0);
        saveGrade("준마", 10);

        mvc.perform(get("/api/v1/grades")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/grades").session(session("ROLE_USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("신마"))
                .andExpect(jsonPath("$[1].minTotalCoupons").value(10))
                .andExpect(jsonPath("$[2].name").value("명마"));
    }

    @Test
    void menuCarriesRequiredGradeToCustomersAndAdmins() throws Exception {
        Grade junma = saveGrade("준마", 10);
        long category = createCategory();

        String created = admin(post("/api/v1/admin/menus"), menuBody(category, "시그니처 라떼", junma.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requiredGrade.name").value("준마"))
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(created, "$.id");
        createMenuWithoutGrade(category);

        // 고객은 로그인하지 않아도 필요한 등급 이름 · 쿠폰 수를 본다
        mvc.perform(get("/api/v1/menus/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiredGrade.id").value(junma.getId()))
                .andExpect(jsonPath("$.requiredGrade.minTotalCoupons").value(10));
        mvc.perform(get("/api/v1/menus"))
                .andExpect(jsonPath("$[?(@.nameKor == '아메리카노')].requiredGrade").value(org.hamcrest.Matchers.contains((Object) null)));

        // 해금 등급을 지우면 누구나
        admin(put("/api/v1/admin/menus/" + id), menuBody(category, "시그니처 라떼", null))
                .andExpect(status().isOk()).andExpect(jsonPath("$.requiredGrade").isEmpty());
    }

    @Test
    void rejectsUnknownGrade() throws Exception {
        admin(post("/api/v1/admin/menus"), menuBody(createCategory(), "시그니처 라떼", 999))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("GRADE_NOT_FOUND"));
    }

    // ───────── 도우미 ─────────

    private Grade saveGrade(String name, int minTotalCoupons) {
        Grade grade = new Grade();
        grade.setName(name);
        grade.setMinTotalCoupons(minTotalCoupons);
        return grades.saveAndFlush(grade);
    }

    private MockHttpSession session(String role) {
        var authentication = new UsernamePasswordAuthenticationToken("test", "", List.of(new SimpleGrantedAuthority(role)));
        var session = new MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(authentication));
        return session;
    }

    private org.springframework.test.web.servlet.ResultActions admin(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String body) throws Exception {
        return mvc.perform(request.with(csrf()).session(session("ROLE_ADMIN")).contentType("application/json").content(body));
    }

    private long createCategory() throws Exception {
        String body = admin(post("/api/v1/admin/categories"), "{\"nameKor\":\"커피\",\"nameEng\":\"Coffee\"}")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(body, "$.id");
        return id.longValue();
    }

    private String menuBody(long categoryId, String nameKor, Integer requiredGradeId) {
        return "{\"categoryId\":%d,\"nameKor\":\"%s\",\"nameEng\":\"Menu\",\"requiredGradeId\":%s,\"sizes\":%s}"
                .formatted(categoryId, nameKor, requiredGradeId == null ? "null" : requiredGradeId, SIZES);
    }

    private void createMenuWithoutGrade(long categoryId) throws Exception {
        admin(post("/api/v1/admin/menus"), menuBody(categoryId, "아메리카노", null)).andExpect(status().isCreated());
    }
}
