// 메뉴 도메인의 유일한 데이터 창구 — /menu 와 /admin/* 가 함께 쓴다.
// 조회는 백엔드 API(GET /api/v1/menus, /api/v1/menus/categories)에서 받아 프론트 타입으로 바꾼다.
//
// 관리자 쓰기 함수는 아직 Mock 이다: 성공 결과만 돌려주고, 변경은 호출한 화면의 React State 에만 반영된다.
import { apiFetch } from "@/lib/api";
import { MENU_IMAGES } from "../_data/menus";
import { MENU_SIZES } from "./menuSize";
import type { Category, CategoryInput, Menu, MenuBadge, MenuInput, MenuStatus, SizePrices } from "../_types";

// Mock id 발급기 — 실제로는 서버가 정한다(관리자 쓰기 함수 연결 전까지).
let nextMenuId = 1000;
let nextCategoryId = 1000;

// ───────── 백엔드 응답 → 프론트 타입 ─────────

/** GET /api/v1/menus 의 한 항목(dto/menu/MenuResponse) */
interface MenuResponse {
  id: number;
  categoryId: number;
  nameKor: string;
  nameEng: string;
  description: string | null;
  image: string | null;
  label: string | null;
  /** 지점별 판매 상태 — ?branchId= 로 조회했을 때만 온다(그 지점에서 숨긴 메뉴는 아예 빠진다) */
  status: MenuStatus | null;
  sizes: { size: string; price: number }[];
}

/** GET /api/v1/menus/categories 의 한 항목(dto/category/CategoryResponse) — 노출 순서대로, 노출하는 것만 온다 */
interface CategoryResponse {
  id: number;
  nameKor: string;
  nameEng: string;
}

const BADGES: readonly string[] = ["BEST", "WINNER", "NEW"] satisfies MenuBadge[];
const FALLBACK_IMAGE = MENU_IMAGES[0].path;

/**
 * 사이즈 S·M·L·XL 가 모두 있으면 사이즈 메뉴(대표 가격 = S), 아니면 단일 가격 메뉴(대표 가격 = 가장 싼 값).
 * 판매 상태는 지점별이라, 지점 없이 조회하면 오지 않아 ON_SALE 로 둔다(삭제된 메뉴는 백엔드가 빼고 준다).
 */
function toMenu(m: MenuResponse): Menu {
  const priceBySize = new Map(m.sizes.map((s) => [s.size, s.price]));
  const sized = MENU_SIZES.every((size) => priceBySize.has(size));
  const sizePrices = sized
    ? (Object.fromEntries(MENU_SIZES.map((size) => [size, priceBySize.get(size)!])) as SizePrices)
    : null;
  const price = sizePrices ? sizePrices.S : Math.min(...m.sizes.map((s) => s.price));

  return {
    id: m.id,
    categoryId: m.categoryId,
    name: m.nameKor,
    engName: m.nameEng,
    price: Number.isFinite(price) ? price : 0,
    sizePrices,
    description: m.description ?? "",
    image: m.image || FALLBACK_IMAGE,
    badge: m.label && BADGES.includes(m.label) ? (m.label as MenuBadge) : undefined,
    status: m.status ?? "ON_SALE",
  };
}

function toCategory(c: CategoryResponse, index: number): Category {
  return { id: c.id, name: c.nameKor, engName: c.nameEng, order: index + 1, visible: true };
}

// ───────── 조회 ─────────

/** GET /api/v1/menus?categoryId= */
export async function getMenus(categoryId?: number): Promise<Menu[]> {
  const query = categoryId === undefined ? "" : `?categoryId=${categoryId}`;
  return (await apiFetch<MenuResponse[]>(`/api/v1/menus${query}`)).map(toMenu);
}

/**
 * GET /api/v1/menus?branchId= — 그 지점의 메뉴별 판매 상태(메뉴 id → 상태).
 * 그 지점에서 숨긴(HIDDEN) 메뉴는 응답에서 빠지므로 결과에 없다. 메뉴판이 화면에 뜬 뒤 브라우저에서 부른다.
 */
export async function getMenuStatuses(branchId: string): Promise<Map<number, MenuStatus>> {
  const menus = await apiFetch<MenuResponse[]>(`/api/v1/menus?branchId=${encodeURIComponent(branchId)}`);
  return new Map(menus.map((m) => [m.id, m.status ?? "ON_SALE"]));
}

export async function getTodayWinnerMenu(): Promise<Menu | null> {
  return (await getMenus()).find((m) => m.badge === "WINNER") ?? null;
}

/** GET /api/v1/menus/categories */
export async function getCategories(): Promise<Category[]> {
  return (await apiFetch<CategoryResponse[]>("/api/v1/menus/categories")).map(toCategory);
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
