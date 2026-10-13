// 여러 페이지(Header · 메인 · /race · /my · /menu/[id] · /cart)가 함께 쓰는 타입.
import type { MenuSize } from "@/app/(site)/menu/_types";

/**
 * 쿠폰은 한 종류다 — 레이스 참가권이자, 모으면 메뉴로 바꾸는 적립 단위(BLUEPRINT 7 "쿠폰 규칙").
 * 그래서 수량과 증감 내역만 둔다. 메뉴 교환이 생기면 "EXCHANGE" 를 추가한다.
 */
export type CouponReason = "ORDER" | "RACE_BET" | "RACE_PAYOUT";

export interface CouponLog {
  id: string;
  reason: CouponReason;
  delta: number; // +1(주문) · −1(레이스 참가) · +4/+3/+2(레이스 1~3위)
  label: string; // "주문 적립 · 아메리카노 외 2건" · "Race #13 · 3번 MOCHA 참가"
  at: string; // ISO
}

/** 주문 한 건 — 주문하는 순간의 장바구니 사본을 그대로 남긴다(메뉴 가격이 바뀌어도 내역은 그대로). */
export interface Order {
  orderNo: number;
  orderedAt: string; // ISO
  lines: CartLine[];
  count: number; // 총 수량
  total: number; // 합계 금액
  summary: string; // "아메리카노 외 2건"
  couponReward: number; // 이 주문으로 적립된 쿠폰 수
}

/** 마이페이지에 모이는 "내 것" — 페이지를 넘나들어 Context(UserProvider)에 둔다. */
export interface UserState {
  coupons: number; // 보유 쿠폰
  couponHistory: CouponLog[]; // 쿠폰 증감 내역, 최신순
  spendCoupon: (reason: CouponReason, label: string) => boolean; // 1장 차감 + 내역 기록, 0장이면 false
  earnCoupons: (amount: number, reason: CouponReason, label: string) => void; // amount 장 적립 + 내역 기록
  favorites: number[]; // 찜한 메뉴 id, 최근 찜한 순
  toggleFavorite: (menuId: number) => void;
  orders: Order[]; // 주문 내역, 최신순
  addOrder: (order: Order) => void;
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
