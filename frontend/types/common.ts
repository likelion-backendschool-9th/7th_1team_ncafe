// 여러 페이지(Header · 메인 · /race · /event)가 함께 쓰는 타입.

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
