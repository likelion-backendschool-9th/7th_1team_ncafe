// 평면도 기하 — 순수 함수. 데이터의 %(Seat.x, y)를 논리 px 로 바꾸고, 테이블 크기와 의자 자리를 정한다.
// 화면은 FLOOR 크기의 상자를 통째로 transform: scale 로 맞추므로(SeatCanvas), 여기 값은 배율과 무관하다.
import type { Chair, Seat } from "../_types";

/** 평면도 논리 크기(px). _data 의 % 좌표는 이 상자 기준. 구역마다 윗선 16px 아래부터 의자 줄이 시작해 구역 이름표(윗선에 걸친 알약, 아래로 11px)와 겹치지 않는다 */
export const FLOOR = { width: 900, height: 702 } as const;
/** 의자 한 변 · 의자 사이 간격 · 테이블 세로(의자는 테이블 위아래 줄에 붙는다) */
export const CHAIR = 28;
export const CHAIR_GAP = 8;
export const TABLE_DEPTH = 52;
const TABLE_PAD = 24;

export function chairId(seatId: string, no: number): string {
  return `${seatId}-${no}`;
}

/** 테이블 윗줄 의자 수(아랫줄은 나머지) — 2인 1+1 · 4인 2+2 · 6인 3+3 · 8인 4+4 */
function topRow(capacity: number): number {
  return Math.ceil(capacity / 2);
}

export function seatCenter(seat: Seat): { x: number; y: number } {
  return { x: (seat.x / 100) * FLOOR.width, y: (seat.y / 100) * FLOOR.height };
}

/** 테이블 상자 크기 — 윗줄 의자가 다 들어가는 폭. 바석은 의자(스툴) 하나 크기 */
export function tableSize(seat: Seat): { w: number; h: number } {
  if (seat.type === "BAR") return { w: CHAIR, h: CHAIR };
  const n = topRow(seat.capacity);
  return { w: n * CHAIR + (n - 1) * CHAIR_GAP + TABLE_PAD, h: TABLE_DEPTH };
}

/** 테이블 상자(좌상단 · 크기, 논리 px) */
export function tableRect(seat: Seat): { x: number; y: number; w: number; h: number } {
  const c = seatCenter(seat);
  const s = tableSize(seat);
  return { x: c.x - s.w / 2, y: c.y - s.h / 2, w: s.w, h: s.h };
}

/** 한 자리의 의자들 — 번호는 윗줄 왼쪽부터, 그다음 아랫줄 왼쪽부터. 바석은 의자 하나 */
export function chairsOf(seat: Seat): Chair[] {
  const center = seatCenter(seat);
  if (seat.type === "BAR") return [{ id: chairId(seat.id, 1), seat, no: 1, x: center.x, y: center.y }];

  const rect = tableRect(seat);
  const top = topRow(seat.capacity);
  const bottom = seat.capacity - top;
  const rowXs = (n: number) => {
    const width = n * CHAIR + (n - 1) * CHAIR_GAP;
    const start = rect.x + rect.w / 2 - width / 2 + CHAIR / 2;
    return Array.from({ length: n }, (_, i) => start + i * (CHAIR + CHAIR_GAP));
  };
  const yTop = rect.y - CHAIR_GAP - CHAIR / 2;
  const yBottom = rect.y + rect.h + CHAIR_GAP + CHAIR / 2;

  const chairs: Chair[] = [];
  rowXs(top).forEach((x, i) => chairs.push({ id: chairId(seat.id, i + 1), seat, no: i + 1, x, y: yTop }));
  rowXs(bottom).forEach((x, i) => chairs.push({ id: chairId(seat.id, top + i + 1), seat, no: top + i + 1, x, y: yBottom }));
  return chairs;
}

export function allChairs(seats: Seat[]): Chair[] {
  return seats.flatMap(chairsOf);
}
