import type { Menu, MenuSize } from "../_types";

/** 작은 것부터 — 메뉴판 가격표 · 상세의 사이즈 선택 · 관리자 폼이 이 순서로 보여 준다. */
export const MENU_SIZES: readonly MenuSize[] = ["S", "M", "L", "XL"];

/** 고른 사이즈의 가격. 사이즈가 없는 메뉴(size = null)는 대표 가격이다. */
export function priceOf(menu: Pick<Menu, "price" | "sizePrices">, size: MenuSize | null): number {
  return size && menu.sizePrices ? menu.sizePrices[size] : menu.price;
}
