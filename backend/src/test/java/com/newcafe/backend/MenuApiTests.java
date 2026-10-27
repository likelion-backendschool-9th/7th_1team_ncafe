package com.newcafe.backend;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;
import com.newcafe.backend.entity.Branch;
import com.newcafe.backend.repository.BranchRepository;

// 메뉴 · 카테고리 · 지점별 판매 상태 API.
// 각자의 application.yml이 초기 데이터(*_data.sql)를 넣더라도 영향받지 않도록 이 테스트에서는 초기 데이터를 끈다.
@SpringBootTest
@Transactional
@TestPropertySource(properties = "spring.sql.init.mode=never")
class MenuApiTests {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired BranchRepository branches;
    private MockMvc mvc;

    private static final String SIZES = """
            [{"size":"S","price":4000},{"size":"M","price":4500},{"size":"L","price":5000},{"size":"XL","price":5500}]""";

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    // ───────── 권한 ─────────

    @Test
    void adminApisNeedHeadOfficeAdmin() throws Exception {
        String body = "{\"nameKor\":\"커피\",\"nameEng\":\"Coffee\"}";
        mvc.perform(post("/api/v1/admin/categories").with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/categories").with(csrf()).session(session("ROLE_USER"))
                .contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/menus")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/admin/branches/mapo/menus/1/status").with(csrf()).session(session("ROLE_USER"))
                .contentType("application/json").content("{\"status\":\"SOLD_OUT\"}")).andExpect(status().isForbidden());
    }

    @Test
    void customerMenuApisAreOpen() throws Exception {
        mvc.perform(get("/api/v1/menus")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/menus/categories")).andExpect(status().isOk());
    }

    // ───────── 카테고리 ─────────

    @Test
    void customerSeesOnlyVisibleCategoriesInOrder() throws Exception {
        long coffee = createCategory("커피", "Coffee", true);
        createCategory("시즌", "Season", false);
        long dessert = createCategory("디저트", "Dessert", true);

        admin(get("/api/v1/admin/categories")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[1].visible").value(false))
                .andExpect(jsonPath("$[2].sortOrder").value(3));
        mvc.perform(get("/api/v1/menus/categories")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(coffee))
                .andExpect(jsonPath("$[1].id").value(dessert));
    }

    @Test
    void rejectsDuplicateAndInvalidCategoryNames() throws Exception {
        createCategory("커피", "Coffee", true);
        admin(post("/api/v1/admin/categories"), "{\"nameKor\":\" 커피 \",\"nameEng\":\"Coffee 2\"}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CATEGORY_NAME_DUPLICATED"));
        admin(post("/api/v1/admin/categories"), "{\"nameKor\":\"차\",\"nameEng\":\"COFFEE\"}")
                .andExpect(status().isConflict());
        admin(post("/api/v1/admin/categories"), "{\"nameKor\":\"차\",\"nameEng\":\"차\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CATEGORY_NAME_ENG_INVALID"));
        admin(post("/api/v1/admin/categories"), "{\"nameKor\":\" \",\"nameEng\":\"Tea\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void reordersCategoriesOnlyWithEveryId() throws Exception {
        long a = createCategory("커피", "Coffee", true);
        long b = createCategory("티", "Tea", true);
        admin(put("/api/v1/admin/categories/order"), "{\"ids\":[" + b + "," + a + "]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(b)).andExpect(jsonPath("$[0].sortOrder").value(1))
                .andExpect(jsonPath("$[1].id").value(a)).andExpect(jsonPath("$[1].sortOrder").value(2));
        admin(put("/api/v1/admin/categories/order"), "{\"ids\":[" + b + "]}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CATEGORY_ORDER_INVALID"));
        admin(put("/api/v1/admin/categories/order"), "{\"ids\":[" + b + "," + b + "]}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void categoryWithMenusCannotBeDeleted() throws Exception {
        long coffee = createCategory("커피", "Coffee", true);
        long empty = createCategory("티", "Tea", true);
        createMenu(coffee, "아메리카노", null);
        admin(delete("/api/v1/admin/categories/" + coffee))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CATEGORY_HAS_MENUS"));
        admin(delete("/api/v1/admin/categories/" + empty)).andExpect(status().isNoContent());
        admin(delete("/api/v1/admin/categories/" + empty)).andExpect(status().isNotFound());
    }

    // ───────── 메뉴 ─────────

    @Test
    void menuNeedsExistingCategory() throws Exception {
        admin(post("/api/v1/admin/menus"), "{\"nameKor\":\"A\",\"nameEng\":\"A\",\"sizes\":" + SIZES + "}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("MENU_CATEGORY_REQUIRED"));
        admin(post("/api/v1/admin/menus"), "{\"categoryId\":999,\"nameKor\":\"A\",\"nameEng\":\"A\",\"sizes\":" + SIZES + "}")
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
    }

    @Test
    void labelMustBeKnownAndWinnerIsUnique() throws Exception {
        long coffee = createCategory("커피", "Coffee", true);
        admin(post("/api/v1/admin/menus"), menuBody(coffee, "아메리카노", "HOT"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("MENU_LABEL_INVALID"));

        long winner = createMenu(coffee, "아메리카노", "WINNER");
        admin(post("/api/v1/admin/menus"), menuBody(coffee, "라떼", "WINNER"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("MENU_WINNER_DUPLICATED"));
        // 이미 WINNER인 메뉴를 그대로 수정하는 것은 된다
        admin(put("/api/v1/admin/menus/" + winner), menuBody(coffee, "아메리카노", "WINNER")).andExpect(status().isOk());
        // 빈 라벨은 라벨 없음
        admin(post("/api/v1/admin/menus"), menuBody(coffee, "라떼", " "))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.label").isEmpty());
    }

    @Test
    void filtersByCategoryAndHidesDeletedMenus() throws Exception {
        long coffee = createCategory("커피", "Coffee", true);
        long dessert = createCategory("디저트", "Dessert", true);
        createMenu(coffee, "아메리카노", null);
        long cake = createMenu(dessert, "당근 케이크", null);

        mvc.perform(get("/api/v1/menus").param("categoryId", String.valueOf(dessert)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nameKor").value("당근 케이크"))
                .andExpect(jsonPath("$[0].status").isEmpty());

        admin(delete("/api/v1/admin/menus/" + cake)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/menus")).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/menus/" + cake)).andExpect(status().isNotFound());
    }

    // ───────── 지점별 판매 상태 ─────────

    @Test
    void branchStatusChangesWhatCustomersSee() throws Exception {
        saveBranch("gangnam");
        saveBranch("mapo");
        long coffee = createCategory("커피", "Coffee", true);
        long americano = createMenu(coffee, "아메리카노", null);
        long latte = createMenu(coffee, "라떼", null);
        long cake = createMenu(coffee, "케이크", null);

        admin(patch("/api/v1/admin/branches/gangnam/menus/" + latte + "/status"), "{\"status\":\"SOLD_OUT\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SOLD_OUT"));
        admin(patch("/api/v1/admin/branches/gangnam/menus/" + cake + "/status"), "{\"status\":\"HIDDEN\"}")
                .andExpect(status().isOk());

        // 강남: 숨김은 빠지고 품절은 표시, 상태 행이 없는 메뉴는 판매 중
        mvc.perform(get("/api/v1/menus").param("branchId", "gangnam"))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.id == " + americano + ")].status").value("ON_SALE"))
                .andExpect(jsonPath("$[?(@.id == " + latte + ")].status").value("SOLD_OUT"));
        mvc.perform(get("/api/v1/menus/" + cake).param("branchId", "gangnam")).andExpect(status().isNotFound());
        // 다른 지점은 영향 없음
        mvc.perform(get("/api/v1/menus").param("branchId", "mapo")).andExpect(jsonPath("$.length()").value(3));
        // 관리자 목록에는 숨김도 보인다
        admin(get("/api/v1/admin/branches/gangnam/menus"))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.menuId == " + cake + ")].status").value("HIDDEN"));

        // 다시 판매 중으로
        admin(patch("/api/v1/admin/branches/gangnam/menus/" + cake + "/status"), "{\"status\":\"ON_SALE\"}")
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/menus").param("branchId", "gangnam")).andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void branchStatusRejectsUnknownBranchMenuAndStatus() throws Exception {
        saveBranch("gangnam");
        long menu = createMenu(createCategory("커피", "Coffee", true), "아메리카노", null);

        admin(patch("/api/v1/admin/branches/seongsu/menus/" + menu + "/status"), "{\"status\":\"SOLD_OUT\"}")
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("BRANCH_NOT_FOUND"));
        admin(get("/api/v1/admin/branches/seongsu/menus")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/menus").param("branchId", "seongsu"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("BRANCH_NOT_FOUND"));
        admin(patch("/api/v1/admin/branches/gangnam/menus/999/status"), "{\"status\":\"SOLD_OUT\"}")
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("MENU_NOT_FOUND"));
        admin(patch("/api/v1/admin/branches/gangnam/menus/" + menu + "/status"), "{\"status\":\"GONE\"}")
                .andExpect(status().isBadRequest());
        admin(patch("/api/v1/admin/branches/gangnam/menus/" + menu + "/status"), "{}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("MENU_STATUS_REQUIRED"));
    }

    // ───────── 도우미 ─────────

    private MockHttpSession session(String role) {
        var authentication = new UsernamePasswordAuthenticationToken("test", "", List.of(new SimpleGrantedAuthority(role)));
        var session = new MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(authentication));
        return session;
    }

    private ResultActions admin(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.with(csrf()).session(session("ROLE_ADMIN")));
    }

    private ResultActions admin(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String body)
            throws Exception {
        return mvc.perform(request.with(csrf()).session(session("ROLE_ADMIN")).contentType("application/json").content(body));
    }

    private long idOf(ResultActions result) throws Exception {
        Number id = JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    private long createCategory(String nameKor, String nameEng, boolean visible) throws Exception {
        return idOf(admin(post("/api/v1/admin/categories"),
                "{\"nameKor\":\"%s\",\"nameEng\":\"%s\",\"visible\":%s}".formatted(nameKor, nameEng, visible))
                .andExpect(status().isCreated()));
    }

    private String menuBody(long categoryId, String nameKor, String label) {
        String labelJson = label == null ? "null" : "\"" + label + "\"";
        return "{\"categoryId\":%d,\"nameKor\":\"%s\",\"nameEng\":\"Menu\",\"label\":%s,\"sizes\":%s}"
                .formatted(categoryId, nameKor, labelJson, SIZES);
    }

    private long createMenu(long categoryId, String nameKor, String label) throws Exception {
        return idOf(admin(post("/api/v1/admin/menus"), menuBody(categoryId, nameKor, label)).andExpect(status().isCreated()));
    }

    private void saveBranch(String id) {
        Branch branch = new Branch();
        branch.setId(id);
        branch.setName("테스트 지점");
        branch.setAddress("서울시");
        branch.setSections("[]");
        branch.setFixtures("[]");
        branch.setOpen(true);
        branches.saveAndFlush(branch);
    }
}
