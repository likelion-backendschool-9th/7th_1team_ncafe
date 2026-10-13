// /seat 도메인 타입 — BLUEPRINT 4 · 8.3.
// 좌석 데이터는 테이블(2~8인) · 바석(1인) 단위로 두고, 예약은 테이블을 의자로 쪼갠 "의자 단위"(사용자 결정 2026-10-13)로 한다.
// 의자 id 는 `${seat.id}-${n}`(_lib/geometry.ts 의 chairId). 좌석 상태는 "지금"이 아니라 지점 · 날짜 · 2시간 시간대마다 다르므로
// Seat 에 두지 않고 ChairStatusMap 으로 따로 받는다(seatService.getChairStatuses).

export type SeatSection = "TRACKSIDE" | "GRANDSTAND" | "PADDOCK" | "LOUNGE";
export type SeatType = "TABLE" | "BAR";
export type SeatStatus = "AVAILABLE" | "USING" | "RESERVED" | "REPAIR";
export type SeatFeature = "WINDOW" | "OUTLET" | "QUIET" | "GROUP" | "NEAR_COUNTER" | "BAR";

/** 테이블 · 바 자리 하나(지시서 18절). 위치는 평면도 기준 % — 이 값만 바꾸면 배치도가 바뀐다. */
export interface Seat {
  id: string; // "T03" · "B01"
  section: SeatSection;
  type: SeatType;
  capacity: number; // 의자 수(바석은 1). 의자 번호는 1~capacity — 테이블 윗줄 왼쪽부터, 그다음 아랫줄
  x: number; // 테이블 중심 x, 평면도 폭 기준 %(0~100)
  y: number; // 테이블 중심 y, 평면도 높이 기준 %
  features: SeatFeature[];
}

/** 테이블을 의자로 쪼갠 것 — _lib/geometry.ts 의 chairsOf 가 만든다(화면 전용, 저장하지 않는다) */
export interface Chair {
  id: string; // "T03-1"
  seat: Seat;
  no: number; // 1~capacity
  x: number; // 의자 중심, 평면도 논리 px(FLOOR 기준)
  y: number;
}

export type FixtureKind = "WINDOW" | "COUNTER" | "ENTRANCE" | "RESTROOM" | "AISLE" | "BAR";

/** 창문 · 카운터 · 출입구 · 화장실 · 통로 · 바 테이블 같은 고정 구조물. 좌표는 평면도 기준 %(좌상단 · 폭 · 높이) */
export interface FloorFixture {
  id: string;
  kind: FixtureKind;
  label: string; // "COUNTER"
  labelKo?: string; // "주문"
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 구역(경마장 이름) 영역 — 반투명 바탕 + 좌상단 라벨 */
export interface FloorSection {
  section: SeatSection;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorPlan {
  sections: FloorSection[];
  fixtures: FloorFixture[];
}

/** 지점(10단계, 사용자 결정 2026-10-13: Mock 3곳 · 같은 평면도 · 좌석 상태만 다르다) */
export interface Branch {
  id: string; // "mapo"
  name: string; // "마포 본점"
  address: string;
}

/** 2시간 예약 시간대 — _data/schedule.ts 의 TIME_BLOCKS */
export interface TimeBlock {
  start: string; // "13:00"
  end: string; // "15:00"
}

/** OPEN: 예약 가능 · LIVE: 지금 진행 중인 시간대(오늘만) · CLOSED: 지나간 시간대 */
export type BlockState = "OPEN" | "LIVE" | "CLOSED";

export interface SlotAvailability extends TimeBlock {
  state: BlockState;
  available: number; // 빈 의자 수
  total: number; // 전체 의자 수
}

/** 좌석 상태를 묻는 단위 — 지점 · 날짜 · 시간대 */
export interface SeatSlot {
  branchId: string;
  date: string; // "2026-10-17"(KST)
  start: string;
  end: string;
}

/** 의자 id → 상태. 없는 의자는 AVAILABLE 로 본다 */
export type ChairStatusMap = Readonly<Record<string, SeatStatus>>;

export interface ReservationRequest {
  slot: SeatSlot;
  branchName: string;
  people: number;
  chairIds: string[];
  chairLabels: string[];
}

export type WaitlistRequest = Omit<ReservationRequest, "chairIds" | "chairLabels">;
