// 경주 일정 — 메인 히어로 · /race · Header · Footer · /event · /admin/race 가 함께 쓰는 순수 함수.
// 모든 계산은 "지금"(epoch ms)을 인자로 받는다. 현재 시각을 읽는 일은 lib/useCountdown.ts 가 브라우저에서만 한다
// (Cache Components 는 클라이언트 컴포넌트도 빌드 때 미리 렌더하므로, 렌더 중에 시각을 읽으면 빌드 오류가 난다).
// 카페가 서울에 있으므로 경주 시각은 브라우저 시간대와 상관없이 한국 시간(KST, UTC+9 · 서머타임 없음) 기준이다.
// 경주 시각은 lib/raceSchedule.ts 의 시간표(기본값 NEXT_PUBLIC_RACE_TIMES + 관리자 변경 이력)에서 온다 — 경주마다 "그 경주 시각에
// 유효했던 시간표"로 열리는지 판단하므로, 시간표를 바꿔도 이미 출발한 경주는 그대로다.
// 백엔드 연결 시 시간표를 GET /api/races/schedule 결과로 바꾼다.
import { candidateRaceTimes, raceTimesAt } from "./raceSchedule";

/** 시작 전 이만큼은 SOON(곧 출발) */
export const RACE_SOON_MS = 10 * 60 * 1000;
/** 시작 후 이만큼은 LIVE(경주 중) */
export const RACE_LIVE_MS = 10 * 60 * 1000;
/** 출발 전 이만큼은 쿠폰을 걸 수 없다(게이트 마감) — 그 뒤 들어온 사람은 관람만 */
export const RACE_GATE_CLOSE_MS = 10 * 1000;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const KST_OFFSET = 9 * 60 * MINUTE;

export interface RaceSlot {
  at: number; // 시작 시각(epoch ms)
  time: string; // "18:00"
  day: "TODAY" | "TOMORROW"; // KST 날짜 기준
}

/** UPCOMING: 다음 경주를 기다리는 중 · SOON: 시작 10분 전부터 · LIVE: 시작 후 10분 */
export type RacePhase = "UPCOMING" | "SOON" | "LIVE";

export interface RaceSchedule {
  phase: RacePhase;
  next: RaceSlot; // 아직 시작하지 않은 가장 가까운 경주(LIVE 동안에도 그다음 경주)
  live: RaceSlot | null; // 진행 중인 경주(LIVE 일 때만)
  remainingMs: number; // next 까지 남은 시간
}

/** now 가 속한 KST 날짜의 00:00(epoch ms) */
export function kstMidnight(now: number): number {
  const shifted = now + KST_OFFSET;
  return shifted - (((shifted % DAY) + DAY) % DAY) - KST_OFFSET;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 그날(KST 0시 = dayStart)에 실제로 열리는 경주 — 후보 시각 중 "그 시각에 유효한 시간표"에 든 것만, 이른 순 */
function startsOn(dayStart: number): { at: number; time: string }[] {
  return candidateRaceTimes()
    .map((time) => ({ at: dayStart + minutesOf(time) * MINUTE, time }))
    .filter((s) => raceTimesAt(s.at).includes(s.time));
}

/**
 * 오늘 · 내일의 경주 시각을 이른 순으로.
 * 경주 시각은 23:50 전까지만 둘 수 있어(관리자 검증) LIVE 구간이 자정을 넘지 않으므로 어제 경주는 볼 필요가 없다.
 */
function slotsAround(now: number): RaceSlot[] {
  const today = kstMidnight(now);
  const days = [
    { start: today, day: "TODAY" as const },
    { start: today + DAY, day: "TOMORROW" as const },
  ];
  return days.flatMap(({ start, day }) => startsOn(start).map((s) => ({ ...s, day })));
}

/** 아직 시작하지 않은 가장 가까운 경주 — 오늘 경주가 다 지났으면 내일 첫 경주 */
export function getNextRaceTime(now: number): RaceSlot {
  const next = slotsAround(now).find((s) => s.at > now);
  // 내일 경주까지 넣었으므로 항상 있다
  return next!;
}

/** 시작 후 RACE_LIVE_MS 안에 있는 경주, 없으면 null */
export function getLiveRaceTime(now: number): RaceSlot | null {
  return slotsAround(now).find((s) => s.at <= now && now < s.at + RACE_LIVE_MS) ?? null;
}

/** afterMs 뒤 ~ untilMs 까지(둘 다 epoch ms, after 제외 · until 포함)의 경주 출발 시각을 이른 순으로 — 지나간 경주 기록 보충용 */
export function getRaceStartsBetween(afterMs: number, untilMs: number): number[] {
  if (!(untilMs > afterMs)) return [];
  const starts: number[] = [];
  for (let day = kstMidnight(afterMs); day <= untilMs; day += DAY) {
    for (const { at } of startsOn(day)) {
      if (at > afterMs && at <= untilMs) starts.push(at);
    }
  }
  return starts;
}

/**
 * 관리자 변경(시간표 · 출전마 성향)이 적용되기 시작하는 시각 — 지금. 다만 다음 경주가 이미 마감(출발 RACE_GATE_CLOSE_MS 전)이라
 * 출발이 확정됐으면 그 경주가 출발한 직후부터(카운트다운 중인 경주가 사라지거나 다른 성향으로 다시 계산되지 않게).
 */
export function changeEffectiveFrom(now: number): number {
  const next = getNextRaceTime(now);
  return now >= next.at - RACE_GATE_CLOSE_MS ? next.at + 1 : now;
}

export function getRaceSchedule(now: number): RaceSchedule {
  const next = getNextRaceTime(now);
  const live = getLiveRaceTime(now);
  const remainingMs = next.at - now;
  const phase: RacePhase = live ? "LIVE" : remainingMs <= RACE_SOON_MS ? "SOON" : "UPCOMING";
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

/** 시계를 읽기 전(정적 셸 · 하이드레이션 전)에 보이는 자리 */
export const COUNTDOWN_PLACEHOLDER = "--:--:--";

/** "오늘 18:00" · "내일 12:30" */
export function formatRaceSlot(slot: RaceSlot): string {
  return `${slot.day === "TODAY" ? "오늘" : "내일"} ${slot.time}`;
}

/**
 * "12:30 · 18:00" — Footer · 이벤트 안내용. 시간표는 부르는 쪽이 넘긴다: 화면에서는 useRaceTimes()(하이드레이션 동안 기본값),
 * 정적 문구에서는 BASE_RACE_TIMES. 렌더 중에 저장소를 직접 읽으면 정적 셸과 첫 렌더가 달라진다.
 */
export function formatRaceTimes(times: readonly string[]): string {
  return times.join(" · ");
}

/** 경주 출발 시각 표시 — "10/13 18:00"(KST). /race 경주 기록 · /my 내 레이스 기록 공용 */
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
