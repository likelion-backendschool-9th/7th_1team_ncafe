// 장바구니 — 백엔드 /api/v1/me/cart (로그인 필요). 한 줄은 메뉴 id + 사이즈로 가리킨다.
// 비로그인 장바구니는 CartProvider 가 이 브라우저(localStorage)에 두고, 로그인하면 mergeCart 로 서버 장바구니에 합친다.
// 로그인 세션 · CSRF 가 필요해 브라우저에서만 부른다(lib/api.ts 의 api()가 둘 다 처리한다).
import { api } from "@/lib/api";
import { lineKey } from "@/lib/cart";
import { FALLBACK_IMAGE } from "@/app/(site)/menu/_lib/menuService";
import { MENU_SIZES } from "@/app/(site)/menu/_lib/menuSize";
import type { MenuSize } from "@/app/(site)/menu/_types";
import type { CartLine } from "@/types/common";

/** 장바구니 한 줄 응답(dto/cart/CartResponse) */
interface CartResponse {
  menuId: number;
  size: string; // "S" — 사이즈 없는 메뉴(디저트)는 "F"
  nameKor: string;
  nameEng: string;
  image: string | null;
  unitPrice: number; // 그 사이즈의 지금 가격
  quantity: number;
}

/** 서버 사이즈 → 프론트 사이즈. S · M · L · XL 이 아니면(디저트의 "F") 사이즈 없는 메뉴(null)다 */
export function toMenuSize(size: string | null): MenuSize | null {
  return MENU_SIZES.find((s) => s === size) ?? null;
}

function toCartLine(r: CartResponse): CartLine {
  const size = toMenuSize(r.size);
  return {
    key: lineKey(r.menuId, size),
    menuId: r.menuId,
    size,
    name: r.nameKor,
    engName: r.nameEng,
    image: r.image || FALLBACK_IMAGE,
    unitPrice: r.unitPrice,
    quantity: r.quantity,
  };
}

/** 요청 본문(dto/cart/CartRequest) — size 가 null 이면 서버가 그 메뉴의 사이즈 없는 가격으로 담는다 */
function item(menuId: number, size: MenuSize | null, quantity: number) {
  return { menuId, size, quantity };
}

/** GET /api/v1/me/cart — 담은 순서 */
export async function getCart(): Promise<CartLine[]> {
  return (await api<CartResponse[]>("/me/cart")).map(toCartLine);
}

/** POST /api/v1/me/cart — 담기(이미 담은 줄이면 수량을 더한다, 최대 20개). 잠긴 메뉴면 403 MENU_LOCKED */
export async function addCartItem(menuId: number, size: MenuSize | null, quantity: number): Promise<CartLine> {
  return toCartLine(await api<CartResponse>("/me/cart", { method: "POST", body: item(menuId, size, quantity) }));
}

/** PUT /api/v1/me/cart — 수량 변경 */
export async function updateCartItem(menuId: number, size: MenuSize | null, quantity: number): Promise<CartLine> {
  return toCartLine(await api<CartResponse>("/me/cart", { method: "PUT", body: item(menuId, size, quantity) }));
}

/** DELETE /api/v1/me/cart/{menuId}?size= — 한 줄 삭제(없던 줄이어도 성공) */
export async function removeCartItem(menuId: number, size: MenuSize | null): Promise<void> {
  await api<void>(`/me/cart/${menuId}${size ? `?size=${size}` : ""}`, { method: "DELETE" });
}

/** DELETE /api/v1/me/cart — 전체 비우기 */
export async function clearCart(): Promise<void> {
  await api<void>("/me/cart", { method: "DELETE" });
}

/** POST /api/v1/me/cart/merge — 비로그인 때 담은 줄을 합치고 합친 장바구니 전체를 받는다(잠긴 · 없어진 메뉴 줄은 서버가 건너뛴다) */
export async function mergeCart(lines: CartLine[]): Promise<CartLine[]> {
  const body = lines.map((l) => item(l.menuId, l.size, l.quantity));
  return (await api<CartResponse[]>("/me/cart/merge", { method: "POST", body })).map(toCartLine);
}
