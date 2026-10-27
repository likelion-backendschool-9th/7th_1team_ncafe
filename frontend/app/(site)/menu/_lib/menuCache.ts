// 메뉴판 캐시 태그 — 메뉴 · 카테고리를 보여 주는 "use cache" 화면(메뉴판 · 메뉴 상세 · 메인 라인업)이 붙인다.
// 관리자가 메뉴 · 카테고리를 바꾸면 app/api/menu-cache 가 이 태그를 무효화해, 다음 요청부터 새 데이터로 다시 만든다.
export const MENU_CACHE_TAG = "menus";
