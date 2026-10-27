// 여러 페이지(Header · 메인 · /race · /my · /menu/[id] · /cart)가 함께 쓰는 타입.
import type { MenuSize } from "@/app/(site)/menu/_types";
import type { RaceBet } from "@/app/(site)/race/_types";

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

/**
 * 내가 참여한 경주 한 건(내 레이스 기록) — 서버 bets 한 줄(GET /api/v1/races/bets/me). 쿠폰을 건 순간 생기고, 경주가 끝나 정산되면 순위 · 돌려받은 쿠폰이 채워진다.
 * 말은 id 로 가리킨다(게이트 번호는 경주마다 바뀔 수 있어 그 경주의 번호를 따로 남긴다 — BLUEPRINT 8.2 "게이트 번호 규칙").
 */
export interface RaceEntry extends RaceBet {
  gate: number; // 그 경주의 게이트 번호 — "3번 MOCHA" 문구용
  rank: number | null; // 내 말의 순위, 정산 전 null
  payout: number; // 돌려받은 쿠폰(원금 포함) — 정산 전 · 4위 이하 0
  settledAt: string | null; // ISO — 정산 시각, 정산 전 null
}

/**
 * 좌석 예약 한 건(11단계) — 지점 · 날짜 · 2시간 시간대 · 의자 단위(BLUEPRINT 8.3).
 * RESERVED 는 자리를 잡은 예약, WAITING 은 자리가 없을 때 넣는 예약대기(의자 없음).
 * /seat 는 같은 시간대의 내 예약을 배치도에 겹쳐 그리고, /my 는 목록으로 보여 준다. 결제 · 쿠폰은 없다.
 */
export type SeatReservationKind = "RESERVED" | "WAITING";

export interface SeatReservation {
  id: string; // "S-0001"
  kind: SeatReservationKind;
  branchId: string;
  branchName: string; // "마포 본점" — 지점 데이터를 다시 보지 않아도 되게 이름을 함께 남긴다
  date: string; // "2026-10-17"(KST)
  start: string; // "13:00"
  end: string; // "15:00"
  people: number;
  chairIds: string[]; // 의자 id("T03-1") — 예약대기는 빈 배열
  chairLabels: string[]; // 표시용 "T03 1번" · "B07"
  reservedAt: string; // ISO
  notifiedAt?: string | null; // 예약대기만 — 같은 시간대 취소로 인원만큼 자리가 난 시각(ISO). 없으면 아직 자리가 안 났다
}

/** 마이페이지에 모이는 "내 것" — 페이지를 넘나들어 Context(UserProvider)에 둔다. */
export interface UserState {
  coupons: number; // 보유 쿠폰
  couponHistory: CouponLog[]; // 쿠폰 증감 내역, 최신순
  earnCoupons: (amount: number, reason: CouponReason, label: string) => void; // amount 장 적립 + 내역 기록
  favorites: number[]; // 찜한 메뉴 id, 최근 찜한 순
  toggleFavorite: (menuId: number) => void;
  orders: Order[]; // 주문 내역, 최신순
  addOrder: (order: Order) => void;
  seatReservations: SeatReservation[]; // 좌석 예약 · 예약대기, 최신순
  addSeatReservation: (reservation: SeatReservation) => void;
  cancelSeatReservation: (id: string) => boolean; // 목록에서 지운다 — 없으면 false
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
