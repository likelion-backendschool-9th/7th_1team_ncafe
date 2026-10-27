// 관리자 메뉴 · 카테고리 · 지점별 판매 상태 — 백엔드 관리자 API(/api/v1/admin/...)를 부른다.
// 로그인 세션과 CSRF 토큰이 필요해 브라우저에서만 부른다(lib/api.ts 의 api()가 둘 다 처리한다).
// 메뉴 등록 · 수정 · 삭제와 카테고리는 본사 공통, 판매 상태(판매 중 · 품절 · 숨김)는 지점별이다.
import { api } from "@/lib/api";
import { toMenu, type MenuResponse } from "@/app/(site)/menu/_lib/menuService";
import type { Branch } from "@/app/(site)/seat/_types";
import type { Category, CategoryInput, Menu, MenuInput, MenuStatus } from "@/app/(site)/menu/_types";

/** dto/category/admin/CategoryResponse */
interface AdminCategoryResponse {
  id: number;
  nameKor: string;
  nameEng: string;
  sortOrder: number;
  visible: boolean;
}

/** dto/menu/admin/BranchMenuResponse */
interface BranchMenuResponse {
  menuId: number;
  status: MenuStatus;
}

const toCategory = (c: AdminCategoryResponse): Category => ({
  id: c.id,
  name: c.nameKor,
  engName: c.nameEng,
  order: c.sortOrder,
  visible: c.visible,
});

/** 폼 값 → dto/menu/admin/MenuRequest. 사이즈가 없는 메뉴는 사이즈 "F" 하나로 보낸다(메뉴판은 S·M·L·XL 이 다 있어야 사이즈 메뉴로 본다). */
const toMenuRequest = (input: MenuInput) => ({
  categoryId: input.categoryId,
  nameKor: input.name,
  nameEng: input.engName,
  description: input.description,
  image: input.image,
  label: input.badge ?? null,
  requiredGradeId: input.requiredGrade?.id ?? null,
  sizes: input.sizePrices
    ? Object.entries(input.sizePrices).map(([size, price]) => ({ size, price }))
    : [{ size: "F", price: input.price }],
});

/**
 * 고객 메뉴판 캐시를 비운다(app/api/menu-cache) — 메뉴 · 카테고리를 바꾼 뒤 부른다.
 * 저장은 이미 끝났으므로 실패해도 오류로 알리지 않는다(메뉴판은 캐시가 끝나는 1시간 안에 따라온다).
 */
async function refreshMenuBoard(): Promise<void> {
  try {
    await fetch("/api/menu-cache", { method: "POST", credentials: "same-origin", cache: "no-store" });
  } catch {
    // 무시 — 위 설명
  }
}

/** 변경 요청을 보내고, 성공하면 고객 메뉴판 캐시를 비운다 */
async function change<T>(request: Promise<T>): Promise<T> {
  const result = await request;
  await refreshMenuBoard();
  return result;
}

// ───────── 메뉴 (본사 공통) ─────────

/** 판매 상태는 지점별이라 여기서는 ON_SALE 로 온다 — 화면이 고른 지점의 상태를 덮어쓴다 */
export async function getAdminMenus(): Promise<Menu[]> {
  return (await api<MenuResponse[]>("/admin/menus")).map(toMenu);
}

export async function createMenu(input: MenuInput): Promise<Menu> {
  return toMenu(await change(api<MenuResponse>("/admin/menus", { method: "POST", body: toMenuRequest(input) })));
}

export async function updateMenu(id: number, input: MenuInput): Promise<Menu> {
  return toMenu(await change(api<MenuResponse>(`/admin/menus/${id}`, { method: "PUT", body: toMenuRequest(input) })));
}

export async function deleteMenu(id: number): Promise<void> {
  await change(api<void>(`/admin/menus/${id}`, { method: "DELETE" }));
}

/** 회원 등급 목록(낮은 등급부터) — 해금 등급 선택지 */
export { getGrades } from "@/app/(site)/menu/_lib/gradeService";

// ───────── 지점별 판매 상태 ─────────

export async function getBranches(): Promise<Branch[]> {
  const branches = await api<{ id: string; name: string; address: string }[]>("/branches");
  return branches.map(({ id, name, address }) => ({ id, name, address }));
}

/** 메뉴 id → 그 지점의 판매 상태 */
export async function getBranchMenuStatuses(branchId: string): Promise<Map<number, MenuStatus>> {
  const rows = await api<BranchMenuResponse[]>(`/admin/branches/${encodeURIComponent(branchId)}/menus`);
  return new Map(rows.map((r) => [r.menuId, r.status]));
}

export async function updateBranchMenuStatus(branchId: string, menuId: number, status: MenuStatus): Promise<void> {
  await api<BranchMenuResponse>(`/admin/branches/${encodeURIComponent(branchId)}/menus/${menuId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

// ───────── 카테고리 (본사 공통) ─────────

/** 숨김 카테고리까지, 노출 순서대로 */
export async function getAdminCategories(): Promise<Category[]> {
  return (await api<AdminCategoryResponse[]>("/admin/categories")).map(toCategory);
}

/** 노출 순서는 서버가 맨 뒤로 정한다 */
export async function createCategory(input: CategoryInput): Promise<Category> {
  return toCategory(
    await change(
      api<AdminCategoryResponse>("/admin/categories", {
        method: "POST",
        body: { nameKor: input.name, nameEng: input.engName, visible: input.visible },
      }),
    ),
  );
}

/** 이름 · 노출 여부만 바꾼다(노출 순서는 그대로) */
export async function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  return toCategory(
    await change(
      api<AdminCategoryResponse>(`/admin/categories/${id}`, {
        method: "PUT",
        body: { nameKor: input.name, nameEng: input.engName, visible: input.visible },
      }),
    ),
  );
}

/** 메뉴가 남아 있으면 서버가 409 로 거절한다 */
export async function deleteCategory(id: number): Promise<void> {
  await change(api<void>(`/admin/categories/${id}`, { method: "DELETE" }));
}

/** ids 순서대로 노출 순서를 1, 2, 3 … 으로 다시 매긴다 */
export async function reorderCategories(ids: number[]): Promise<Category[]> {
  return (await change(api<AdminCategoryResponse[]>("/admin/categories/order", { method: "PUT", body: { ids } }))).map(toCategory);
}
