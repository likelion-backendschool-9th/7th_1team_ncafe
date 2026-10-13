// 이벤트 저장소 — 기본값(_data/events.ts) 또는 관리자가 바꾼 목록(localStorage, 사용자 결정 2026-10-14: 같은 브라우저 사용자 화면에도 반영).
// eventService 가 읽고 쓰며, 화면은 _hooks/useEvents 로 구독한다. 백엔드가 붙으면 이 파일은 지운다.
import { createLocalStore } from "@/lib/localStore";
import { EVENTS } from "../_data/events";
import type { CafeEvent, EventStatus, EventTimeMode } from "../_types";

const STATUSES: readonly EventStatus[] = ["ONGOING", "UPCOMING", "ENDED"];
const TIME_MODES: readonly EventTimeMode[] = ["NONE", "TEXT", "RACE"];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");
const isYmdOrNull = (v: unknown) => v === null || (typeof v === "string" && YMD.test(v));
const isOptionalString = (v: unknown) => v === undefined || typeof v === "string";

function isEvent(v: unknown): v is CafeEvent {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "number" &&
    typeof e.title === "string" &&
    typeof e.period === "string" &&
    TIME_MODES.includes(e.timeMode as EventTimeMode) &&
    typeof e.time === "string" &&
    typeof e.description === "string" &&
    isStringArray(e.steps) &&
    isStringArray(e.notes) &&
    isYmdOrNull(e.startDate) &&
    isYmdOrNull(e.endDate) &&
    (e.statusOverride === null || STATUSES.includes(e.statusOverride as EventStatus)) &&
    typeof e.visible === "boolean" &&
    isOptionalString(e.ctaLabel) &&
    isOptionalString(e.ctaHref)
  );
}

function parseEvents(raw: unknown): CafeEvent[] | null {
  return Array.isArray(raw) && raw.every(isEvent) ? raw : null;
}

export const eventStore = createLocalStore<CafeEvent[]>("ncafe.events.v1", EVENTS, parseEvents);
