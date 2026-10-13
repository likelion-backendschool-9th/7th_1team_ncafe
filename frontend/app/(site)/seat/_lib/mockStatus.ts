// Mock 좌석 상태 생성기 — 지점 · 날짜 · 시간대로 시드한 결정적 난수라 같은 시간대는 몇 번을 다시 받아도 같다.
// 서버가 붙으면 seatService.getChairStatuses 가 API 결과를 돌려주고 이 파일은 지운다.
import type { BlockState, ChairStatusMap, Seat, SeatSlot, SeatStatus } from "../_types";
import { chairId } from "./geometry";
import { isWeekend } from "./schedule";

/** FNV-1a 32bit */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 시작 시각별 기본 점유율(1시간 블록) — 점심 · 저녁이 붐비고 아침 · 밤은 한산하다 */
const OCCUPANCY: Record<string, number> = {
  "09:00": 0.3,
  "10:00": 0.4,
  "11:00": 0.52,
  "12:00": 0.7,
  "13:00": 0.72,
  "14:00": 0.62,
  "15:00": 0.56,
  "16:00": 0.55,
  "17:00": 0.62,
  "18:00": 0.68,
  "19:00": 0.6,
  "20:00": 0.45,
  "21:00": 0.3,
};
const WEEKEND_BONUS = 0.15;
const MAX_OCCUPANCY = 0.92;

/**
 * 시간대 하나의 의자 상태. 점유 패턴은 시간대만으로 정해지고(OPEN ↔ LIVE 가 바뀌어도 같은 자리가 차 있다),
 * LIVE 일 때만 찬 자리의 일부가 "사용 중"으로 보인다. 지점마다 한 자리는 수리 중이다.
 */
export function mockChairStatuses(seats: Seat[], slot: SeatSlot, state: BlockState): ChairStatusMap {
  const key = `${slot.branchId}|${slot.date}|${slot.start}`;
  const rng = mulberry32(hash(key));
  const liveRng = mulberry32(hash(`${key}|live`));
  const branchFactor = 0.9 + (hash(slot.branchId) % 3) * 0.1; // 0.9 · 1.0 · 1.1
  const occupancy = Math.min(
    MAX_OCCUPANCY,
    (OCCUPANCY[slot.start] ?? 0.5) * branchFactor + (isWeekend(slot.date) ? WEEKEND_BONUS : 0),
  );
  const repairSeatId = seats[hash(`${slot.branchId}|repair`) % seats.length]?.id;
  const takenStatus = (): SeatStatus => (state === "LIVE" && liveRng() < 0.7 ? "USING" : "RESERVED");

  const out: Record<string, SeatStatus> = {};
  for (const seat of seats) {
    if (seat.id === repairSeatId) {
      for (let no = 1; no <= seat.capacity; no++) out[chairId(seat.id, no)] = "REPAIR";
      continue;
    }
    // 두 번의 난수는 결과와 상관없이 항상 소비한다(앞 자리의 결과가 뒷자리의 난수를 밀지 않게)
    const taken = rng() < occupancy;
    const roll = rng();
    let takenCount = 0;
    if (taken) takenCount = seat.capacity >= 4 ? Math.max(1, Math.round(seat.capacity * (0.5 + 0.5 * roll))) : seat.capacity;
    for (let no = 1; no <= seat.capacity; no++) {
      out[chairId(seat.id, no)] = no <= takenCount ? takenStatus() : "AVAILABLE";
    }
  }
  return out;
}
