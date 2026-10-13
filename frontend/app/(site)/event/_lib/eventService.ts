// 이벤트 도메인의 데이터 창구 — 백엔드 연결 시 이 파일만 fetch 로 교체한다.
// Mock 단계에는 관리자 변경을 localStorage 저장소(eventStore)에 남겨 같은 브라우저의 손님 화면에도 보이게 한다(사용자 결정 2026-10-14).
// 손님 화면 · 관리자 화면의 클라이언트 컴포넌트는 _hooks/useEvents 로 같은 저장소를 구독한다(서버 렌더에서는 기본값).
import type { CafeEvent, CafeEventInput, EventStatus } from "../_types";
import { eventStore } from "./eventStore";

/** GET /api/events — 전체 이벤트(손님 화면에 무엇을 보일지는 eventStatus.isShownOnSite 로 거른다) */
export async function getEvents(): Promise<CafeEvent[]> {
  return structuredClone(eventStore.get());
}

/** GET /api/events/{id} */
export async function getEvent(id: number): Promise<CafeEvent | null> {
  const event = eventStore.get().find((e) => e.id === id);
  return event ? structuredClone(event) : null;
}

// ---------- 관리자 ----------

function write(update: (events: CafeEvent[]) => CafeEvent[]) {
  eventStore.set(update(eventStore.get()));
}

function requireEvent(id: number): CafeEvent {
  const event = eventStore.get().find((e) => e.id === id);
  if (!event) throw new Error(`event ${id} not found`);
  return event;
}

/** POST /api/admin/events */
export async function createEvent(input: CafeEventInput): Promise<CafeEvent> {
  const id = eventStore.get().reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const event: CafeEvent = { ...input, id };
  write((events) => [...events, event]);
  return structuredClone(event);
}

/** PUT /api/admin/events/{id} */
export async function updateEvent(id: number, input: CafeEventInput): Promise<CafeEvent> {
  requireEvent(id);
  const event: CafeEvent = { ...input, id };
  write((events) => events.map((e) => (e.id === id ? event : e)));
  return structuredClone(event);
}

/** DELETE /api/admin/events/{id} */
export async function deleteEvent(id: number): Promise<void> {
  requireEvent(id);
  write((events) => events.filter((e) => e.id !== id));
}

/** PATCH /api/admin/events/{id}/visibility — 노출 허가 */
export async function updateEventVisibility(id: number, visible: boolean): Promise<CafeEvent> {
  const event = { ...requireEvent(id), visible };
  write((events) => events.map((e) => (e.id === id ? event : e)));
  return structuredClone(event);
}

/** PATCH /api/admin/events/{id}/status — 상태 직접 지정(null 이면 날짜로 자동) */
export async function updateEventStatus(id: number, statusOverride: EventStatus | null): Promise<CafeEvent> {
  const event = { ...requireEvent(id), statusOverride };
  write((events) => events.map((e) => (e.id === id ? event : e)));
  return structuredClone(event);
}

/** Mock 전용 — 관리자 변경을 지우고 기본 이벤트로 되돌린다(백엔드가 붙으면 없어진다) */
export async function resetEvents(): Promise<void> {
  eventStore.clear();
}
