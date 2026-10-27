import type { Menu, MenuBadge } from "../menu/_types";

const BADGE_RANK: Record<MenuBadge, number> = { WINNER: 0, BEST: 1, NEW: 2 };
const NO_BADGE_RANK = 3;

function rank(menu: Menu): number {
  return menu.badge ? BADGE_RANK[menu.badge] : NO_BADGE_RANK;
}

/**
 * 메인 "TODAY'S LINEUP" 선정 — 순수 함수.
 * HIDDEN 제외 → WINNER → BEST → NEW → 배지 없음 순(같은 등급은 원래 순서 유지) → 앞에서 count 개.
 * 품절도 제자리에 둔다 — 카드에 SOLD OUT 을 띄워 오늘 인기 메뉴가 품절됐다는 것까지 보여 준다.
 */
export function pickLineup(menus: Menu[], count: number): Menu[] {
  return menus
    .filter((m) => m.status !== "HIDDEN")
    .map((menu, order) => ({ menu, order }))
    .sort((a, b) => rank(a.menu) - rank(b.menu) || a.order - b.order)
    .slice(0, count)
    .map(({ menu }) => menu);
}
