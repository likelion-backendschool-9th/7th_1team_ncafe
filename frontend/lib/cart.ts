// 장바구니 계산 — 순수 함수. CartProvider(비로그인 장바구니 · 서버 장바구니를 화면에 먼저 반영할 때)와 /cart · /menu/[id] 화면이 함께 쓴다.
import type { MenuSize } from "@/app/(site)/menu/_types";
import type { CartItem, CartLine } from "@/types/common";

/** 한 줄(같은 메뉴·사이즈)에 담을 수 있는 최대 수량 */
export const CART_MAX_QUANTITY = 20;

export function lineKey(menuId: number, size: MenuSize | null): string {
  return `${menuId}:${size ?? "-"}`;
}

/** 1 ~ CART_MAX_QUANTITY 사이의 정수로 맞춘다. */
export function clampQuantity(quantity: number): number {
  return Math.min(CART_MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

/** 담기 — 이미 담은 메뉴·사이즈면 수량만 더하고(최대치까지), 처음이면 맨 뒤에 새 줄로 붙인다. */
export function addLine(lines: CartLine[], item: CartItem, quantity: number): CartLine[] {
  const key = lineKey(item.menuId, item.size);
  if (!lines.some((l) => l.key === key)) return [...lines, { ...item, key, quantity: clampQuantity(quantity) }];
  return lines.map((l) => (l.key === key ? { ...l, ...item, quantity: clampQuantity(l.quantity + quantity) } : l));
}

/** 서버가 돌려준 줄로 바꾼다 — 같은 줄이 있으면 그 자리에서 바꾸고, 없으면 맨 뒤에 붙인다. */
export function putLine(lines: CartLine[], line: CartLine): CartLine[] {
  if (!lines.some((l) => l.key === line.key)) return [...lines, line];
  return lines.map((l) => (l.key === line.key ? line : l));
}

export function setLineQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  return lines.map((l) => (l.key === key ? { ...l, quantity: clampQuantity(quantity) } : l));
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((l) => l.key !== key);
}

/** 총 수량 — 아메리카노 M 2개 + 라떼 L 1개 = 3 */
export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}
