import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import MenuBoard from "./_components/MenuBoard";
import { MENU_CACHE_TAG } from "./_lib/menuCache";
import { selectBoard } from "./_lib/menuBoard";
import { getCategories, getMenuBranches, getMenus } from "./_lib/menuService";

export const metadata: Metadata = { title: "MENU BOARD" };

/**
 * 손님용 메뉴판 — 경마 티켓 스타일. 설계: BLUEPRINT 8.4.
 * 모두에게 같은 내용이라 "use cache" 로 정적 셸에 넣는다(MenuLineup 과 같은 방식).
 * 탭 선택·검색어는 클라이언트 State 라 URL(?category=, ?q=)에는 남기지 않는다 — 쿼리를 읽으면 정적 셸에서 빠진다.
 * 카드를 누르면 상세(/menu/[id])로 간다.
 * Mock 단계에서는 관리자 화면의 변경이 여기 반영되지 않는다(서비스 쓰기 함수가 데이터를 바꾸지 않음).
 */
export default async function MenuPage() {
  "use cache";
  cacheLife("hours");
  cacheTag(MENU_CACHE_TAG); // 관리자가 메뉴 · 카테고리를 바꾸면 app/api/menu-cache 가 무효화한다

  const [categories, menus, branches] = await Promise.all([getCategories(), getMenus(), getMenuBranches()]);
  const board = selectBoard(categories, menus);

  return (
    <div className="container page">
      <MenuBoard categories={board.categories} menus={board.menus} branches={branches}>
        <div className="section-head">
          <span className="eyebrow">Today&apos;s Line-up</span>
          <h1 className="title-xl">MENU BOARD</h1>
          <p className="subtitle">오늘 트랙에 오른 음료와 디저트를 티켓 한 장씩 골라 보세요.</p>
        </div>
      </MenuBoard>
    </div>
  );
}
