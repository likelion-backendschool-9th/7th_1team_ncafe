package com.newcafe.backend;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import com.newcafe.backend.entity.Category;
import com.newcafe.backend.entity.Menu;
import com.newcafe.backend.repository.CategoryRepository;
import com.newcafe.backend.repository.MenuRepository;

// 찜(/api/v1/me/favorites) — 실제 회원가입 · 로그인 세션으로 부른다(로그인 회원 번호로 찜을 나눈다).
// 각자의 application.yml이 초기 데이터(*_data.sql)를 넣더라도 영향받지 않도록 이 테스트에서는 초기 데이터를 끈다.
@SpringBootTest
@Transactional
@TestPropertySource(properties = "spring.sql.init.mode=never")
class WishApiTests {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired CategoryRepository categories;
    @Autowired MenuRepository menus;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    @Test
    void favoritesNeedLogin() throws Exception {
        mvc.perform(get("/api/v1/me/favorites")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/me/favorites/1").with(csrf())).andExpect(status().isUnauthorized());
    }

    @Test
    void addsInRecentOrderAndIgnoresRepeats() throws Exception {
        long americano = saveMenu("아메리카노");
        long latte = saveMenu("라떼");
        var alice = signupAndLogin("alice");

        favorite(alice, americano).andExpect(status().isNoContent());
        Thread.sleep(5); // 찜한 시각으로 정렬하므로 두 찜의 시각이 겹치지 않게 한다
        favorite(alice, latte).andExpect(status().isNoContent());
        favorite(alice, americano).andExpect(status().isNoContent()); // 이미 찜했어도 그대로

        mvc.perform(get("/api/v1/me/favorites").session(alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0]").value(latte))
                .andExpect(jsonPath("$[1]").value(americano));
    }

    @Test
    void removesAndToleratesMissingFavorites() throws Exception {
        long americano = saveMenu("아메리카노");
        var alice = signupAndLogin("alice");
        favorite(alice, americano);

        unfavorite(alice, americano).andExpect(status().isNoContent());
        unfavorite(alice, americano).andExpect(status().isNoContent()); // 없던 찜을 해제해도 오류가 아니다
        mvc.perform(get("/api/v1/me/favorites").session(alice)).andExpect(content().json("[]"));
    }

    @Test
    void rejectsUnknownMenuAndDropsDeletedMenus() throws Exception {
        long americano = saveMenu("아메리카노");
        var alice = signupAndLogin("alice");

        favorite(alice, 999L).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("MENU_NOT_FOUND"));

        favorite(alice, americano);
        menus.deleteLogicallyById(americano);
        mvc.perform(get("/api/v1/me/favorites").session(alice)).andExpect(content().json("[]"));
        favorite(alice, americano).andExpect(status().isNotFound());
    }

    @Test
    void membersHaveSeparateFavorites() throws Exception {
        long americano = saveMenu("아메리카노");
        var alice = signupAndLogin("alice");
        var bobby = signupAndLogin("bobby");

        favorite(alice, americano);
        mvc.perform(get("/api/v1/me/favorites").session(bobby)).andExpect(content().json("[]"));
        unfavorite(bobby, americano); // 남의 찜은 지워지지 않는다
        mvc.perform(get("/api/v1/me/favorites").session(alice)).andExpect(jsonPath("$.length()").value(1));
    }

    // ───────── 도우미 ─────────

    private MockHttpSession signupAndLogin(String id) throws Exception {
        String body = "{\"loginId\":\"%s\",\"password\":\"password123\",\"nickname\":\"Tester\"}".formatted(id);
        mvc.perform(post("/api/v1/auth/signup").with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isCreated());
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                        .content("{\"loginId\":\"%s\",\"password\":\"password123\"}".formatted(id)))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private org.springframework.test.web.servlet.ResultActions favorite(MockHttpSession session, long menuId) throws Exception {
        return mvc.perform(put("/api/v1/me/favorites/" + menuId).with(csrf()).session(session));
    }

    private org.springframework.test.web.servlet.ResultActions unfavorite(MockHttpSession session, long menuId) throws Exception {
        return mvc.perform(delete("/api/v1/me/favorites/" + menuId).with(csrf()).session(session));
    }

    private long saveMenu(String nameKor) {
        Category category = categories.findAll().stream().findFirst().orElseGet(() -> {
            Category c = new Category();
            c.setNameKor("커피");
            c.setNameEng("Coffee");
            c.setSortOrder(1);
            return categories.saveAndFlush(c);
        });
        Menu menu = new Menu();
        menu.setCategory(category);
        menu.setNameKor(nameKor);
        menu.setNameEng("Menu");
        return menus.saveAndFlush(menu).getId();
    }
}
