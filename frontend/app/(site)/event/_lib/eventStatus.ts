// 이벤트 상태 · 노출 · 표시 문구 — 순수 함수(/event · /event/[id] · 관리자 공용).
// 상태는 날짜로 자동 계산하고, 관리자가 직접 지정했으면 그 값이 우선이다(사용자 결정 2026-10-14).
// 손님 화면(/event)에는 "진행 중"이거나 "노출 허가"를 켠 이벤트만 보인다. 날짜는 모두 KST "YYYY-MM-DD"(lib/kst.ts).
import { formatYmdKo, ymdParts, ymdToEpoch } from "@/lib/kst";
import type { CafeEvent, EventStatus } from "../_types";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  ONGOING: "진행 중",
  UPCOMING: "예정",
  ENDED: "종료",
};

export const EVENT_STATUSES: readonly EventStatus[] = ["ONGOING", "UPCOMING", "ENDED"];

type Dated = Pick<CafeEvent, "startDate" | "endDate">;

/** 날짜로 정한 상태 — 시작일 전이면 예정, 종료일이 지났으면 종료(종료일 당일까지 진행 중), 날짜가 없으면 진행 중(상시) */
export function autoStatus(event: Dated, today: string): EventStatus {
  if (event.startDate && today < event.startDate) return "UPCOMING";
  if (event.endDate && today > event.endDate) return "ENDED";
  return "ONGOING";
}

/** 실제 상태 — 관리자가 지정했으면 그 값, 아니면 날짜로 */
export function eventStatus(event: CafeEvent, today: string): EventStatus {
  return event.statusOverride ?? autoStatus(event, today);
}

/** 손님 화면(/event · /event/[id])에 보이는가 — 진행 중이거나 노출 허가 */
export function isShownOnSite(event: CafeEvent, today: string): boolean {
  return eventStatus(event, today) === "ONGOING" || event.visible;
}

const STATUS_ORDER: Record<EventStatus, number> = { ONGOING: 0, UPCOMING: 1, ENDED: 2 };

/** 손님 화면 순서 — 진행 중(목록 순서 그대로) → 예정(시작이 가까운 순) → 종료(최근에 끝난 순) */
export function sortForSite(events: readonly CafeEvent[], today: string): CafeEvent[] {
  const keyed = events.map((event, index) => ({ event, index, status: eventStatus(event, today) }));
  return keyed
    .sort((a, b) => {
      if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (a.status === "UPCOMING") return (a.event.startDate ?? "").localeCompare(b.event.startDate ?? "") || a.index - b.index;
      if (a.status === "ENDED") return (b.event.endDate ?? "").localeCompare(a.event.endDate ?? "") || a.index - b.index;
      return a.index - b.index;
    })
    .map((k) => k.event);
}

/** 기간 표시 — "2026.10.24(토) ~ 11.01(일)" · "2026.10.24(토)부터" · "2026.11.01(일)까지" · "상시" */
export function formatEventPeriod(event: Dated): string {
  const { startDate: start, endDate: end } = event;
  if (start && end) {
    const sameYear = ymdParts(start).year === ymdParts(end).year;
    return `${formatYmdKo(start)} ~ ${formatYmdKo(end, !sameYear)}`;
  }
  if (start) return `${formatYmdKo(start)}부터`;
  if (end) return `${formatYmdKo(end)}까지`;
  return "상시";
}

const DAY = 24 * 60 * 60 * 1000;

/** 상태 옆 작은 글씨 — 예정 "D-10" · 진행 중 "D-3"(종료일까지, 오늘 끝나면 "오늘 종료") · 그 밖에는 빈 문자열 */
export function statusHint(event: CafeEvent, today: string): string {
  const status = eventStatus(event, today);
  if (status === "UPCOMING" && event.startDate && event.startDate > today) {
    return `D-${Math.round((ymdToEpoch(event.startDate) - ymdToEpoch(today)) / DAY)}`;
  }
  if (status === "ONGOING" && event.endDate && event.endDate >= today) {
    const left = Math.round((ymdToEpoch(event.endDate) - ymdToEpoch(today)) / DAY);
    return left === 0 ? "오늘 종료" : `D-${left}`;
  }
  return "";
}

/** 상태가 왜 그런지(관리자 상세) — "관리자가 직접 지정" · "시작일(10.24) 전" · "종료일(10.07)이 지남" · "기간 중" · "기간 제한 없음(상시)" */
export function statusReason(event: CafeEvent, today: string): string {
  if (event.statusOverride) {
    const auto = autoStatus(event, today);
    return auto === event.statusOverride
      ? "관리자가 직접 지정했어요(날짜 기준과 같아요)."
      : `관리자가 직접 지정했어요. 날짜 기준이라면 '${EVENT_STATUS_LABEL[auto]}'이에요.`;
  }
  const auto = autoStatus(event, today);
  if (auto === "UPCOMING") return `시작일(${formatYmdKo(event.startDate!, false)}) 전이라 자동으로 예정이에요.`;
  if (auto === "ENDED") return `종료일(${formatYmdKo(event.endDate!, false)})이 지나 자동으로 종료됐어요.`;
  if (!event.startDate && !event.endDate) return "기간 제한이 없는 상시 이벤트라 자동으로 진행 중이에요.";
  return "기간 중이라 자동으로 진행 중이에요.";
}

/** 노출 설명(관리자) — 손님 화면에 보이는지와 그 이유 */
export function visibilityReason(event: CafeEvent, today: string): string {
  const status = eventStatus(event, today);
  if (status === "ONGOING") return "진행 중이라 손님 화면(/event)에 보여요.";
  if (event.visible) return `${EVENT_STATUS_LABEL[status]} 상태지만 노출 허가가 켜져 있어 손님 화면에 보여요.`;
  return `${EVENT_STATUS_LABEL[status]} 상태라 손님 화면에 보이지 않아요. 노출 허가를 켜면 보여요.`;
}

/** 카드 시각 칸 — 경주 시간표 따라가기면 raceTimes("12:30 · 18:00"), 직접 입력이면 그 문구, 없으면 null */
export function eventTimeText(event: CafeEvent, raceTimes: string): string | null {
  if (event.timeMode === "RACE") return raceTimes;
  if (event.timeMode === "TEXT" && event.time.trim()) return event.time.trim();
  return null;
}

/** 주소의 id → 숫자(양의 정수가 아니면 null) */
export function parseEventId(param: string): number | null {
  return /^[1-9]\d{0,8}$/.test(param) ? Number(param) : null;
}
