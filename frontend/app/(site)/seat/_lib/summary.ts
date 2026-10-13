// 좌석 현황 요약(지시서 16절) — 의자 상태에서 파생하는 순수 함수. 별도 카운트 State 를 두지 않는다(BLUEPRINT 8.3).
import type { ChairStatusMap, Seat, SeatStatus } from "../_types";
import { chairId } from "./geometry";

export interface SeatSummaryData {
  available: number; // 빈 의자
  total: number; // 전체 의자
  byStatus: Record<SeatStatus, number>;
  emptyTables: { capacity: number; count: number }[]; // 의자가 전부 빈 테이블 수, 인원별(2인 · 4인 · 6인 · 8인)
  emptyStools: number; // 빈 바석
}

export function summarize(seats: Seat[], statuses: ChairStatusMap): SeatSummaryData {
  const byStatus: Record<SeatStatus, number> = { AVAILABLE: 0, USING: 0, RESERVED: 0, REPAIR: 0 };
  const emptyByCapacity = new Map<number, number>();
  let emptyStools = 0;
  let total = 0;

  for (const seat of seats) {
    if (seat.type === "TABLE" && !emptyByCapacity.has(seat.capacity)) emptyByCapacity.set(seat.capacity, 0);
    let empty = 0;
    for (let no = 1; no <= seat.capacity; no++) {
      const status = statuses[chairId(seat.id, no)] ?? "AVAILABLE";
      byStatus[status]++;
      total++;
      if (status === "AVAILABLE") empty++;
    }
    if (empty === seat.capacity) {
      if (seat.type === "BAR") emptyStools++;
      else emptyByCapacity.set(seat.capacity, (emptyByCapacity.get(seat.capacity) ?? 0) + 1);
    }
  }

  const emptyTables = [...emptyByCapacity]
    .sort((a, b) => a[0] - b[0])
    .map(([capacity, count]) => ({ capacity, count }));
  return { available: byStatus.AVAILABLE, total, byStatus, emptyTables, emptyStools };
}

/** 전체 의자 수만(상태 없이) */
export function totalChairs(seats: Seat[]): number {
  return seats.reduce((n, s) => n + s.capacity, 0);
}
