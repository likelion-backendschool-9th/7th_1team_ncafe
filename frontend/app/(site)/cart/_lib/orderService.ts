// 주문 데이터 창구 — 지금은 목업이라 결제 없이 주문 한 건을 만들어 돌려주기만 한다.
// 주문 내역 저장(useUser().addOrder)과 쿠폰 적립(useUser().earnCoupons)은 호출한 쪽(CartView)이 반영한다.
// 백엔드 연결 시 이 파일만 POST /api/orders 로 교체하고, 내역·적립은 서버가 처리한 값을 다시 불러온다.
import { cartCount, cartTotal } from "@/lib/cart";
import type { CartLine, Order } from "@/types/common";

/** 주문 1회당 적립 쿠폰 수 — 담은 수량과 무관하다(BLUEPRINT 7 "쿠폰 규칙"). */
export const ORDER_COUPON_REWARD = 1;

// Mock 주문번호 발급기 — 실제로는 서버가 정한다.
let nextOrderNo = 1;

/** 첫 줄 메뉴 이름 + 나머지 줄 수 — "아메리카노", "아메리카노 외 2건" */
export function orderSummary(lines: CartLine[]): string {
  if (lines.length === 0) return "";
  const rest = lines.length - 1;
  return rest > 0 ? `${lines[0].name} 외 ${rest}건` : lines[0].name;
}

/** POST /api/orders — 주문하는 순간의 장바구니를 사본으로 남긴다. */
export async function placeOrder(lines: CartLine[]): Promise<Order> {
  if (lines.length === 0) throw new Error("빈 장바구니는 주문할 수 없습니다.");
  return {
    orderNo: nextOrderNo++,
    orderedAt: new Date().toISOString(),
    lines: structuredClone(lines),
    count: cartCount(lines),
    total: cartTotal(lines),
    summary: orderSummary(lines),
    couponReward: ORDER_COUPON_REWARD,
  };
}
