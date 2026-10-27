// 이벤트 도메인의 데이터 창구 — 백엔드(Spring) /api/v1/events/** · /api/v1/admin/events/** 를 부른다(lib/api.ts, next.config.ts 프록시).
// 응답은 화면 타입(_types)과 같은 모양이다(기간은 KST 날짜). 브라우저에서만 부른다 — 화면은 _lib/eventStore 의 저장소를 구독하고,
// 쓰기 뒤에는 그 저장소를 다시 불러온다. 참여 신청의 쿠폰 적립은 서버가 한다.
import { api, ApiError } from "@/lib/api";
import type { CafeEvent, CafeEventInput, EventApply, EventStatus } from "../_types";

/** 신청 · 관리자 쓰기를 막는 서버 응답 코드(409 · 404) */
export type EventErrorCode =
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_ONGOING"
  | "EVENT_ALREADY_APPLIED"
  | "EVENT_FULL"
  | "EVENT_HAS_APPLIES"
  | "EVENT_COUPON_LOCKED"
  | "EVENT_CAPACITY_BELOW_APPLIES"
  | "EVENT_TITLE_DUPLICATED";

export class EventError extends Error {
  constructor(
    readonly code: EventErrorCode | string,
    message: string,
  ) {
    super(message);
  }
}

/** ApiError → EventError(서버 코드 · 문구 그대로). 그 밖의 오류는 그대로 던진다 */
async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 403) {
      throw new EventError(e.code, e.message);
    }
    throw e;
  }
}

/** GET /api/v1/events — 손님 화면에 보이는 이벤트(진행 중 · 노출 허가), 최신 등록순 */
export async function getEvents(): Promise<CafeEvent[]> {
  return api<CafeEvent[]>("/events");
}

/** POST /api/v1/events/{id}/applies — 참여 신청. 진행 중 · 회원당 한 번 · 쿠폰 지급 이벤트는 선착순 안 — 쿠폰 적립은 서버가 한다 */
export async function applyEvent(eventId: number): Promise<EventApply> {
  return call(() => api<EventApply>(`/events/${eventId}/applies`, { method: "POST" }));
}

/** GET /api/v1/events/applies/me — 내 신청 기록, 최신순. 로그인하지 않았으면 빈 목록 */
export async function getMyApplies(): Promise<EventApply[]> {
  try {
    return await api<EventApply[]>("/events/applies/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return [];
    throw e;
  }
}

// ---------- 관리자 (ADMIN 로그인 필요) ----------

/** GET /api/v1/admin/events — 모든 이벤트(숨긴 이벤트 포함), 최신 등록순 */
export async function getAdminEvents(): Promise<CafeEvent[]> {
  return api<CafeEvent[]>("/admin/events");
}

/** POST /api/v1/admin/events */
export async function createEvent(input: CafeEventInput): Promise<CafeEvent> {
  return call(() => api<CafeEvent>("/admin/events", { method: "POST", body: input }));
}

/** PUT /api/v1/admin/events/{id} — 신청자가 있으면 쿠폰 지급 여부 · 지급 쿠폰 수를 바꿀 수 없고, 선착순 인원을 참여 인원보다 줄일 수 없다 */
export async function updateEvent(id: number, input: CafeEventInput): Promise<CafeEvent> {
  return call(() => api<CafeEvent>(`/admin/events/${id}`, { method: "PUT", body: input }));
}

/** DELETE /api/v1/admin/events/{id} — 신청자가 있는 이벤트는 지울 수 없다(신청 기록 · 지급 쿠폰 내역이 가리킨다) */
export async function deleteEvent(id: number): Promise<void> {
  return call(() => api<void>(`/admin/events/${id}`, { method: "DELETE" }));
}

/** PATCH /api/v1/admin/events/{id}/visible — 노출 허가만 바꾼다 */
export async function updateEventVisibility(id: number, visible: boolean): Promise<CafeEvent> {
  return call(() => api<CafeEvent>(`/admin/events/${id}/visible`, { method: "PATCH", body: { visible } }));
}

/** PATCH /api/v1/admin/events/{id}/status — 상태 직접 지정만 바꾼다(null 이면 날짜로 자동) */
export async function updateEventStatus(id: number, status: EventStatus | null): Promise<CafeEvent> {
  return call(() => api<CafeEvent>(`/admin/events/${id}/status`, { method: "PATCH", body: { status } }));
}
