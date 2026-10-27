// 좌석 데이터 창구(BLUEPRINT 6) — 백엔드(Spring) /api/v1/seats/** · /api/v1/branches 를 부른다(lib/api.ts, next.config.ts 프록시).
// 지점 · 좌석 배치 · 시간대는 /seat · 메인의 "use cache" 셸이 서버에서 읽는다(apiFetch).
// 시간대별 좌석 상태 · 잔여석 · 내 예약 · 예약 · 예약대기 · 취소는 브라우저에서 부른다(api — 쓰기 요청에는 CSRF 토큰을 붙인다).
// 실패하면 ApiError(서버 code · message) — 예약이 막힌 이유(자리를 뺏김 · 예약 수 초과 · 노쇼 제한)는 message 를 그대로 보여 준다.
// 평면도(창문 · 카운터 같은 구조물)는 아직 서버에 없어 _data/floorPlan.ts 를 그대로 쓴다.
import { api, ApiError, apiFetch } from "@/lib/api";
import type { SeatReservation } from "@/types/common";
import { FLOOR_PLAN } from "../_data/floorPlan";
import { MAX_PEOPLE } from "../_data/schedule";
import type {
  Branch,
  BranchOccupancy,
  ChairStatusMap,
  FloorPlan,
  ReservationRequest,
  Seat,
  SeatSlot,
  SlotAvailability,
  TimeBlock,
  WaitlistRequest,
} from "../_types";

/** 한 번에 예약할 수 있는 최대 인원 — 컴포넌트는 _data 대신 여기서 읽는다(서버 SeatSchedule.MAX_PEOPLE 과 같은 값) */
export const SEAT_MAX_PEOPLE = MAX_PEOPLE;

/** GET /api/v1/branches — 영업 중인 지점만(영업하지 않는 지점은 예약할 수 없다). 서버 순서(지점 id 순) 그대로 */
export async function getBranches(): Promise<Branch[]> {
  const branches = await apiFetch<(Branch & { open: boolean })[]>("/api/v1/branches");
  return branches.filter((b) => b.open).map(({ id, name, address }) => ({ id, name, address }));
}

/** GET /api/v1/seats?branchId= — 그 지점의 좌석 배치. 지점마다 배치는 같고 상태(예약 · 수리 중)만 다르다 */
export async function getSeats(branchId: string): Promise<Seat[]> {
  return apiFetch<Seat[]>(`/api/v1/seats?branchId=${encodeURIComponent(branchId)}`);
}

/** 평면도 구조물 — 서버에 생기기 전까지 프론트 데이터 */
export async function getFloorPlan(): Promise<FloorPlan> {
  return structuredClone(FLOOR_PLAN);
}

/** GET /api/v1/seats/time-blocks — 1시간 블록 13개(09:00~22:00) */
export async function getTimeBlocks(): Promise<TimeBlock[]> {
  return apiFetch<TimeBlock[]>("/api/v1/seats/time-blocks");
}

/** GET /api/v1/seats/status?branchId&date&start — 그 시간대의 의자 상태(의자 id → 상태, 빈 의자는 빠진다) */
export async function getChairStatuses(slot: SeatSlot): Promise<ChairStatusMap> {
  const query = new URLSearchParams({ branchId: slot.branchId, date: slot.date, start: slot.start });
  return api<ChairStatusMap>(`/seats/status?${query}`);
}

/** GET /api/v1/seats/availability?branchId&date — 그 날 시간대마다 빈 의자 수 · 상태(지남 · 진행 중 · 예약 가능). 내 예약도 찬 자리로 센다 */
export async function getSlotAvailability(branchId: string, date: string): Promise<SlotAvailability[]> {
  const query = new URLSearchParams({ branchId, date });
  return api<SlotAvailability[]>(`/seats/availability?${query}`);
}

/**
 * GET /api/v1/seats/occupancy — 메인 "지점별 좌석 현황". 영업 중인 지점마다 그 날 시간대별 잔여석.
 * 날짜는 오늘, 오늘 시간대가 모두 지났으면(영업 종료 뒤) 내일 — /seat 의 기본 날짜와 같은 규칙이다(서버가 정한다).
 */
export async function getBranchOccupancy(): Promise<{ date: string; branches: BranchOccupancy[] }> {
  return api<{ date: string; branches: BranchOccupancy[] }>("/seats/occupancy");
}

/** GET /api/v1/seats/reservations/me — 내 예약 · 예약대기, 최신순(취소한 건은 빠진다). 로그인하지 않았으면 빈 목록 */
export async function getMySeatReservations(): Promise<SeatReservation[]> {
  try {
    return await api<SeatReservation[]>("/seats/reservations/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return [];
    throw e;
  }
}

/** POST /api/v1/seats/reservations — 의자 단위 예약. 결제 없음. 같은 시간대의 내 예약대기는 서버가 함께 취소한다 */
export async function reserveChairs(req: ReservationRequest): Promise<SeatReservation> {
  return api<SeatReservation>("/seats/reservations", {
    method: "POST",
    body: { slot: req.slot, people: req.people, chairIds: req.chairIds },
  });
}

/** POST /api/v1/seats/waitlist — 자리가 없을 때 예약대기. 요금 없음. 시간대 시작 전까지만 */
export async function joinWaitlist(req: WaitlistRequest): Promise<SeatReservation> {
  return api<SeatReservation>("/seats/waitlist", {
    method: "POST",
    body: { slot: req.slot, people: req.people },
  });
}

/** DELETE /api/v1/seats/reservations/{id} — 예약(시작 전까지) · 예약대기(언제든) 취소 */
export async function cancelReservation(id: number): Promise<void> {
  await api<void>(`/seats/reservations/${id}`, { method: "DELETE" });
}
