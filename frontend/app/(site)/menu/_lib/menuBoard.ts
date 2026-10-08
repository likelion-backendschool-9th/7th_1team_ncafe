import type { Category, Menu } from "../_types";

/**
 * 손님용 메뉴판에 올릴 카테고리·메뉴 선정 — 순수 함수.
 * - 카테고리: visible 인 것만 order 순
 * - 메뉴: HIDDEN 제외, 숨김 카테고리에 속한 메뉴 제외, 카테고리 order 순(같은 카테고리는 원래 순서 유지)
 * 품절(SOLD_OUT)은 그대로 두고 카드에서 "품절"로 표시한다.
 */
export function selectBoard(categories: Category[], menus: Menu[]): { categories: Category[]; menus: Menu[] } {
  const visible = categories.filter((c) => c.visible).sort((a, b) => a.order - b.order);
  const rank = new Map(visible.map((c, i) => [c.id, i]));

  const shown = menus
    .filter((m) => m.status !== "HIDDEN" && rank.has(m.categoryId))
    .map((menu, order) => ({ menu, order }))
    .sort((a, b) => rank.get(a.menu.categoryId)! - rank.get(b.menu.categoryId)! || a.order - b.order)
    .map(({ menu }) => menu);

  return { categories: visible, menus: shown };
}

/** 상세 주소 /menu/[id] 의 id — "7" 같은 양의 정수만 받는다("07", "7a" 는 없는 메뉴) */
export function parseMenuId(param: string): number | null {
  return /^[1-9]\d*$/.test(param) ? Number(param) : null;
}

export interface MenuDetailData {
  menu: Menu;
  category: Category;
  /** 같은 카테고리의 다른 메뉴 — 메뉴판 순서 */
  related: Menu[];
}

/**
 * 상세 페이지 데이터 — 메뉴판(selectBoard)에 보이는 메뉴만 연다.
 * HIDDEN 이거나 숨김 카테고리에 속한 메뉴는 null(→ 404). 품절은 그대로 열고 "품절"로 표시한다.
 */
export function selectDetail(categories: Category[], menus: Menu[], id: number, relatedLimit = 3): MenuDetailData | null {
  const board = selectBoard(categories, menus);
  const menu = board.menus.find((m) => m.id === id);
  const category = menu && board.categories.find((c) => c.id === menu.categoryId);
  if (!menu || !category) return null;

  const related = board.menus.filter((m) => m.categoryId === menu.categoryId && m.id !== id).slice(0, relatedLimit);
  return { menu, category, related };
}

/** 티켓 STUB 의 일련번호 — "No.0007" */
export function ticketSerial(id: number): string {
  return `No.${String(id).padStart(4, "0")}`;
}
