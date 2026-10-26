// 경주 일정 — 메인 히어로 · /race · Header · Footer · /event · /admin/race 가 함께 쓰는 순수 함수.
// 모든 계산은 "지금"(epoch ms)을 인자로 받는다. 현재 시각을 읽는 일은 lib/useCountdown.ts 가 브라우저에서만 한다
// (Cache Components 는 클라이언트 컴포넌트도 빌드 때 미리 렌더하므로, 렌더 중에 시각을 읽으면 빌드 오류가 난다).
// 카페가 서울에 있으므로 날짜 · 시각 표시는 브라우저 시간대와 상관없이 한국 시간(KST, UTC+9 · 서머타임 없음) 기준이다.
// 경주 시각은 lib/raceSchedule.ts 의 일정(서버 GET /api/v1/races/schedule — 관리자가 날짜 · 시각을 골라 추가한 경주, 사용자 결정 2026-10-27)에서 온다.
// 일정이 비어 있거나 다 지나면 "다음 경주"가 없다(next: null).
import { addDays, formatKstTime, formatMdKo, kstDate } from "./kst";
import { raceStarts } from "./raceSchedule";

/** 시작 전 이만큼은 SOON(곧 출발) */
export const RACE_SOON_MS = 10 * 60 * 1000;
/** 시작 후 이만큼은 LIVE(경주 중) */
export const RACE_LIVE_MS = 10 * 60 * 1000;
/** 출발 전 이만큼은 쿠폰을 걸 수 없다(게이트 마감) — 그 뒤 들어온 사람은 관람만 */
export const RACE_GATE_CLOSE_MS = 10 * 1000;

export interface RaceSlot {
  at: number; // 시작 시각(epoch ms)
  time: string; // "18:00"(KST)
  date: string; // "2026-10-29"(KST)
  day: "TODAY" | "TOMORROW" | "LATER"; // 지금 기준 KST 날짜
}

/** UPCOMING: 다음 경주를 기다리는 중 · SOON: 시작 10분 전부터 · LIVE: 시작 후 10분 · NONE: 예정된 경주 없음 */
export type RacePhase = "UPCOMING" | "SOON" | "LIVE" | "NONE";

export interface RaceSchedule {
  phase: RacePhase;
  next: RaceSlot | null; // 아직 시작하지 않은 가장 가까운 경주(LIVE 동안에도 그다음 경주), 없으면 null
  live: RaceSlot | null; // 진행 중인 경주(LIVE 일 때만)
  remainingMs: number | null; // next 까지 남은 시간
}

function toSlot(at: number, now: number): RaceSlot {
  const date = kstDate(at);
  const today = kstDate(now);
  const day = date === today ? "TODAY" : date === addDays(today, 1) ? "TOMORROW" : "LATER";
  return { at, time: formatKstTime(at), date, day };
}

/** 아직 시작하지 않은 가장 가까운 경주, 없으면 null */
export function getNextRaceTime(now: number): RaceSlot | null {
  const at = raceStarts().find((s) => s > now);
  return at === undefined ? null : toSlot(at, now);
}

/** 시작 후 RACE_LIVE_MS 안에 있는 경주, 없으면 null — 경주 사이는 20분 이상이라(관리자 검증) 둘이 겹치지 않는다 */
export function getLiveRaceTime(now: number): RaceSlot | null {
  const at = raceStarts().find((s) => s <= now && now < s + RACE_LIVE_MS);
  return at === undefined ? null : toSlot(at, now);
}

export function getRaceSchedule(now: number): RaceSchedule {
  const next = getNextRaceTime(now);
  const live = getLiveRaceTime(now);
  const remainingMs = next ? next.at - now : null;
  const phase: RacePhase = live ? "LIVE" : remainingMs === null ? "NONE" : remainingMs <= RACE_SOON_MS ? "SOON" : "UPCOMING";
  return { phase, next, live, remainingMs };
}

/** 남은 시간 → "01:24:32" (초는 올림 — 00:00:00 은 출발하는 순간에만) */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** 스크린리더용 — "1시간 24분 32초" · "5분 3초" · "0초" */
export function formatCountdownSpoken(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h && `${h}시간`, m && `${m}분`, (s || total === 0) && `${s}초`].filter(Boolean).join(" ");
}

/** 시계를 읽기 전(정적 셸 · 하이드레이션 전) · 다음 경주가 없을 때 보이는 자리 */
export const COUNTDOWN_PLACEHOLDER = "--:--:--";

/** "오늘 18:00" · "내일 12:30" · "10/29(목) 18:00" — 날짜와 시각 사이는 줄바꿈 없는 공백(좁은 칸에서 둘이 갈라지지 않게) */
export function formatRaceSlot(slot: RaceSlot): string {
  const day = slot.day === "TODAY" ? "오늘" : slot.day === "TOMORROW" ? "내일" : formatMdKo(slot.date);
  return `${day} ${slot.time}`;
}

/**
 * 사이트의 경주 일정 문구(Footer · /event · 이벤트 관리, 사용자 결정 2026-10-27) — 오늘 아직 끝나지 않은 경주가 있으면
 * "오늘 12:30 · 18:00", 없으면 "다음 경주 10/29(목) 18:00", 일정이 없으면 "예정된 경주 없음".
 * 화면에서는 lib/useCountdown.ts 의 useRaceDayText()로 읽는다(마운트 전에는 null).
 */
export function formatRaceDayText(now: number): string {
  const today = kstDate(now);
  const todays = raceStarts().filter((s) => kstDate(s) === today);
  if (todays.some((s) => s + RACE_LIVE_MS > now)) return `오늘 ${todays.map(formatKstTime).join(" · ")}`;
  const next = getNextRaceTime(now);
  return next ? `다음 경주 ${formatRaceSlot(next)}` : "예정된 경주 없음";
}

/** 경주 출발 시각 표시 — "10/13 18:00"(KST). /race 경주 기록 · /my 내 레이스 기록 · 관리자 공용 */
export function formatRaceDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}
