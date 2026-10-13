// 경주 일정 — 메인 히어로 · /race · Header · Footer · /event 가 함께 쓰는 순수 함수.
// 모든 계산은 "지금"(epoch ms)을 인자로 받는다. 현재 시각을 읽는 일은 lib/useCountdown.ts 가 브라우저에서만 한다
// (Cache Components 는 클라이언트 컴포넌트도 빌드 때 미리 렌더하므로, 렌더 중에 시각을 읽으면 빌드 오류가 난다).
// 카페가 서울에 있으므로 경주 시각은 브라우저 시간대와 상관없이 한국 시간(KST, UTC+9 · 서머타임 없음) 기준이다.
// 백엔드 연결 시 getRaceSchedule 의 입력(RACE_TIMES)을 GET /api/races/next 결과로 바꾼다.

/** 매일 열리는 경주 시각(KST, "HH:MM", 이른 순) */
export const RACE_TIMES = ["12:30", "18:00"] as const;

/** 시작 전 이만큼은 SOON(곧 출발) */
export const RACE_SOON_MS = 10 * 60 * 1000;
/** 시작 후 이만큼은 LIVE(경주 중) */
export const RACE_LIVE_MS = 10 * 60 * 1000;

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
function kstMidnight(now: number): number {
  const shifted = now + KST_OFFSET;
  return shifted - (((shifted % DAY) + DAY) % DAY) - KST_OFFSET;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 오늘 · 내일의 경주 시각을 이른 순으로.
 * 경주 시각이 23:50 이후가 아니라면 LIVE 구간이 자정을 넘지 않으므로 어제 경주는 볼 필요가 없다.
 */
function slotsAround(now: number): RaceSlot[] {
  const today = kstMidnight(now);
  const days = [
    { start: today, day: "TODAY" as const },
    { start: today + DAY, day: "TOMORROW" as const },
  ];
  return days.flatMap(({ start, day }) =>
    RACE_TIMES.map((time) => ({ at: start + minutesOf(time) * MINUTE, time, day })),
  );
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

/** "12:30 · 18:00" — Footer · 이벤트 안내용 */
export function formatRaceTimes(): string {
  return RACE_TIMES.join(" · ");
}
