// 여러 페이지(Header · 메인 · /race · /event · /menu/[id] · /cart)가 함께 쓰는 타입.
import type { MenuSize } from "@/app/(site)/menu/_types";

export interface Coupon {
  id: string;
  kind: "RACE_TICKET" | "FREE_AMERICANO";
  label: string;
  issuedAt: string; // ISO
  used: boolean;
}

export interface UserState {
  coupons: number; // 레이스 참가권 개수
  rewards: Coupon[]; // 레이스 우승 보상
  spendCoupon: () => boolean; // 0장이면 false
  addReward: (c: Coupon) => void;
}

/** 장바구니 한 줄 — 같은 메뉴·같은 사이즈는 한 줄로 합친다. */
export interface CartLine {
  key: string; // lib/cart.ts 의 lineKey — "1:M", 사이즈 없는 메뉴는 "13:-"
  menuId: number;
  size: MenuSize | null; // null = 사이즈 없는 메뉴(디저트)
  name: string;
  engName: string;
  image: string;
  unitPrice: number; // 담을 때의 그 사이즈 가격 — 주문 API 가 생기면 서버가 다시 계산한다
  quantity: number;
}

/** 담을 메뉴 — 줄 key 와 수량은 장바구니가 정한다. */
export type CartItem = Omit<CartLine, "key" | "quantity">;

export interface CartState {
  lines: CartLine[]; // 담은 순서
  count: number; // 총 수량(Header 숫자)
  total: number; // 합계 금액
  add: (item: CartItem, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}
