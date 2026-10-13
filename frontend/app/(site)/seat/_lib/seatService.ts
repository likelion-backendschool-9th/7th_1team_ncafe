// 좌석 데이터 창구(BLUEPRINT 6) — 지금은 Mock. 백엔드 연결 시 이 파일만 API 호출로 바꾼다.
// 읽기: 지점 · 좌석 · 평면도 · 시간대 · 시간대별 좌석 상태 · 잔여석. 쓰기: 예약 · 예약대기 · 취소(결과만 돌려주고 반영은 호출한 쪽의 UserProvider 가 한다).
// 좌석 상태는 지점 · 날짜 · 시간대로 시드한 결정적 Mock(_lib/mockStatus.ts)이라 새로고침해도 같은 시간대는 같다.
import { kstDate, kstMinutes, minutesOf } from "@/lib/kst";
import type { SeatReservation } from "@/types/common";
import { BRANCHES } from "../_data/branches";
import { FLOOR_PLAN } from "../_data/floorPlan";
import { MAX_PEOPLE, TIME_BLOCKS } from "../_data/schedule";
import { SEATS } from "../_data/seats";
import type {
  Branch,
  ChairStatusMap,
  FloorPlan,
  ReservationRequest,
  Seat,
  SeatSlot,
  SlotAvailability,
  TimeBlock,
  WaitlistRequest,
} from "../_types";
import { mockChairStatuses } from "./mockStatus";
import { blockState } from "./schedule";
import { summarize, totalChairs } from "./summary";

/** 한 번에 예약할 수 있는 최대 인원 — 컴포넌트는 _data 대신 여기서 읽는다 */
export const SEAT_MAX_PEOPLE = MAX_PEOPLE;

/** GET /api/branches */
export async function getBranches(): Promise<Branch[]> {
  return structuredClone(BRANCHES);
}

/** GET /api/seats */
export async function getSeats(): Promise<Seat[]> {
  return structuredClone(SEATS);
}

/** GET /api/seats/floor-plan */
export async function getFloorPlan(): Promise<FloorPlan> {
  return structuredClone(FLOOR_PLAN);
}

/** GET /api/seats/time-blocks */
export async function getTimeBlocks(): Promise<TimeBlock[]> {
  return structuredClone(TIME_BLOCKS);
}

function blockOf(start: string, end: string): TimeBlock {
  return TIME_BLOCKS.find((b) => b.start === start) ?? { start, end };
}

/** GET /api/seats/status?branch&date&start — 그 시간대의 의자 상태(의자 id → 상태) */
export async function getChairStatuses(slot: SeatSlot, now: number): Promise<ChairStatusMap> {
  return mockChairStatuses(SEATS, slot, blockState(slot.date, blockOf(slot.start, slot.end), now));
}

/** GET /api/seats/availability?branch&date — 그 날 시간대마다 빈 의자 수 · 상태(지남 · 진행 중 · 예약 가능) */
export async function getSlotAvailability(branchId: string, date: string, now: number): Promise<SlotAvailability[]> {
  return TIME_BLOCKS.map((block) => {
    const state = blockState(date, block, now);
    const statuses = mockChairStatuses(SEATS, { branchId, date, ...block }, state);
    const { available, total } = summarize(SEATS, statuses);
    return { ...block, state, available, total };
  });
}

// Mock 예약 번호 — 실제로는 서버가 정한다.
let nextNo = 1;
const newId = () => `S-${String(nextNo++).padStart(4, "0")}`;

/** POST /api/seats/reservations — 의자 단위 예약. 결제 없음. */
export async function reserveChairs(req: ReservationRequest): Promise<SeatReservation> {
  if (req.chairIds.length === 0) throw new Error("예약할 의자를 골라 주세요.");
  if (req.chairIds.length !== req.people) throw new Error("인원 수만큼 의자를 골라야 합니다.");
  return {
    id: newId(),
    kind: "RESERVED",
    branchId: req.slot.branchId,
    branchName: req.branchName,
    date: req.slot.date,
    start: req.slot.start,
    end: req.slot.end,
    people: req.people,
    chairIds: [...req.chairIds],
    chairLabels: [...req.chairLabels],
    reservedAt: new Date().toISOString(),
  };
}

/** POST /api/seats/waitlist — 자리가 없을 때 예약대기. 요금 없음. */
export async function joinWaitlist(req: WaitlistRequest): Promise<SeatReservation> {
  return {
    id: newId(),
    kind: "WAITING",
    branchId: req.slot.branchId,
    branchName: req.branchName,
    date: req.slot.date,
    start: req.slot.start,
    end: req.slot.end,
    people: req.people,
    chairIds: [],
    chairLabels: [],
    reservedAt: new Date().toISOString(),
  };
}

/** DELETE /api/seats/reservations/{id} — 예약 · 예약대기 취소 */
export async function cancelReservation(id: string): Promise<{ ok: true; id: string }> {
  return { ok: true, id };
}

/**
 * 메인 대시보드(14단계)용 요약 — 본점의 지금 시간대(영업 전이면 첫 시간대) 빈 의자 수.
 * 영업이 끝났으면 block 이 null 이고 available 은 0.
 */
export async function getSeatSummary(now: number): Promise<{ available: number; total: number; block: TimeBlock | null }> {
  const total = totalChairs(SEATS);
  const minute = kstMinutes(now);
  const block = TIME_BLOCKS.find((b) => minute < minutesOf(b.end)) ?? null;
  if (!block) return { available: 0, total, block: null };
  const slot: SeatSlot = { branchId: BRANCHES[0].id, date: kstDate(now), ...block };
  const statuses = mockChairStatuses(SEATS, slot, blockState(slot.date, block, now));
  return { available: summarize(SEATS, statuses).available, total, block };
}
