import type { Menu, MenuBadge } from "../menu/_types";

const BADGE_RANK: Record<MenuBadge, number> = { WINNER: 0, BEST: 1, NEW: 2 };
const NO_BADGE_RANK = 3;
const SOLD_OUT_PENALTY = 10;

function rank(menu: Menu): number {
  const base = menu.badge ? BADGE_RANK[menu.badge] : NO_BADGE_RANK;
  return menu.status === "SOLD_OUT" ? base + SOLD_OUT_PENALTY : base;
}

/**
 * 메인 "TODAY'S LINEUP" 선정 — 순수 함수.
 * HIDDEN 제외 → WINNER → BEST → NEW → 배지 없음 순(같은 등급은 원래 순서 유지), 품절은 맨 뒤로 → 앞에서 count 개.
 */
export function pickLineup(menus: Menu[], count: number): Menu[] {
  return menus
    .filter((m) => m.status !== "HIDDEN")
    .map((menu, order) => ({ menu, order }))
    .sort((a, b) => rank(a.menu) - rank(b.menu) || a.order - b.order)
    .slice(0, count)
    .map(({ menu }) => menu);
}
