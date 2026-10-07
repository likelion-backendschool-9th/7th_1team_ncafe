// 메뉴 도메인의 유일한 데이터 창구 — /menu 와 /admin/* 가 함께 쓴다.
// 백엔드 연결 시 이 파일만 fetch 로 교체한다.
//
// Mock 단계의 한계: 쓰기 함수는 성공 결과만 돌려준다. 변경은 호출한 화면의 React State 에만 반영되고,
// 새로고침하면 초기화된다.
import { CATEGORIES } from "../_data/categories";
import { MENU_IMAGES, MENUS } from "../_data/menus";
import type { Category, CategoryInput, Menu, MenuInput, MenuStatus } from "../_types";

// Mock id 발급기 — 실제로는 서버가 정한다.
let nextMenuId = Math.max(...MENUS.map((m) => m.id)) + 1;
let nextCategoryId = Math.max(...CATEGORIES.map((c) => c.id)) + 1;

// ───────── 조회 ─────────

export async function getMenus(categoryId?: number): Promise<Menu[]> {
  const list = categoryId === undefined ? MENUS : MENUS.filter((m) => m.categoryId === categoryId);
  return structuredClone(list);
}

export async function getTodayWinnerMenu(): Promise<Menu | null> {
  return structuredClone(MENUS.find((m) => m.badge === "WINNER") ?? null);
}

export async function getCategories(): Promise<Category[]> {
  return structuredClone([...CATEGORIES].sort((a, b) => a.order - b.order));
}

export async function getMenuImageOptions(): Promise<{ path: string; label: string }[]> {
  return structuredClone(MENU_IMAGES);
}

// ───────── 관리자: 메뉴 ─────────

/** POST /api/admin/menus */
export async function createMenu(input: MenuInput): Promise<Menu> {
  return { ...structuredClone(input), id: nextMenuId++ };
}

/** PUT /api/admin/menus/{id} */
export async function updateMenu(id: number, input: MenuInput): Promise<Menu> {
  return { ...structuredClone(input), id };
}

/** DELETE /api/admin/menus/{id} */
export async function deleteMenu(id: number): Promise<{ ok: true; id: number }> {
  return { ok: true, id };
}

/** PATCH /api/admin/menus/{id}/status */
export async function updateMenuStatus(id: number, status: MenuStatus): Promise<{ ok: true; id: number; status: MenuStatus }> {
  return { ok: true, id, status };
}

// ───────── 관리자: 카테고리 ─────────

/** POST /api/admin/categories — order 는 맨 뒤 */
export async function createCategory(input: CategoryInput, order: number): Promise<Category> {
  return { ...structuredClone(input), id: nextCategoryId++, order };
}

/** PUT /api/admin/categories/{id} */
export async function updateCategory(id: number, input: CategoryInput, order: number): Promise<Category> {
  return { ...structuredClone(input), id, order };
}

/** DELETE /api/admin/categories/{id} — 메뉴가 남아 있으면 서버가 거절하는 것을 가정 */
export async function deleteCategory(id: number): Promise<{ ok: true; id: number }> {
  return { ok: true, id };
}

/** PUT /api/admin/categories/order — ids 순서대로 order 1, 2, 3 … */
export async function reorderCategories(ids: number[]): Promise<{ ok: true; ids: number[] }> {
  return { ok: true, ids: [...ids] };
}

// 추후(API)
// export async function getMenus(categoryId?: number) {
//   const q = categoryId ? `?categoryId=${categoryId}` : "";
//   const res = await fetch(`${API_BASE}/api/menus${q}`);
//   return res.json() as Promise<Menu[]>;
// }
