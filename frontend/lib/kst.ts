// 한국 시간(KST, UTC+9 · 서머타임 없음) 날짜 순수 함수 — /seat(예약 날짜 · 시간대) · /my(좌석 예약 내역 표시) 공용.
// 날짜는 "YYYY-MM-DD" 문자열로 다루고, 산술은 UTC 자정 epoch 로 한다(브라우저 시간대와 무관).
// 경주 일정(lib/time.ts)과 같은 이유로 KST 기준이다 — 카페가 서울에 있다.

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const KST_OFFSET = 9 * 60 * MINUTE;

export const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" → 그 날 UTC 자정(epoch ms). 날짜 산술 전용 */
export function ymdToEpoch(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function epochToYmd(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function ymdParts(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

/** now(epoch ms)가 속한 KST 날짜 */
export function kstDate(now: number): string {
  return epochToYmd(now + KST_OFFSET);
}

/** now 의 KST 시각을 그 날 0시부터의 분으로(0~1439) */
export function kstMinutes(now: number): number {
  const shifted = now + KST_OFFSET;
  return Math.floor((((shifted % DAY) + DAY) % DAY) / MINUTE);
}

export function addDays(ymd: string, days: number): string {
  return epochToYmd(ymdToEpoch(ymd) + days * DAY);
}

/** 0 = 일요일 */
export function dayOfWeek(ymd: string): number {
  return new Date(ymdToEpoch(ymd)).getUTCDay();
}

/** "HH:MM" → 그 날 0시부터의 분 */
export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "2026-10-17" → "2026.10.17(토)" · withYear false 면 "10.17(토)" */
export function formatYmdKo(ymd: string, withYear = true): string {
  const { year, month, day } = ymdParts(ymd);
  const wd = WEEKDAY_KO[dayOfWeek(ymd)];
  return withYear ? `${year}.${pad(month)}.${pad(day)}(${wd})` : `${pad(month)}.${pad(day)}(${wd})`;
}

/** 스크린리더용 — "10월 17일 토요일" */
export function formatYmdSpoken(ymd: string): string {
  const { month, day } = ymdParts(ymd);
  return `${month}월 ${day}일 ${WEEKDAY_KO[dayOfWeek(ymd)]}요일`;
}
