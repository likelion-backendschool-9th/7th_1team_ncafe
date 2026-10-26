// 관리자 경주 현황 · 일정 달력 — 경주 한 줄(번호 · 상태 · 결과) · 날짜별 경주표 · 달력 칸. 순수 함수.
import { raceResult } from "@/app/(site)/race/_lib/records";
import type { RaceResult, ServerRace } from "@/app/(site)/race/_types";
import { addDays, dayOfWeek, kstDate } from "@/lib/kst";
import { RACE_GATE_CLOSE_MS, RACE_SOON_MS } from "@/lib/time";

/** 종료(결과 확정) · 경주 중(출발했고 결과 전) · 마감(출발 10초 전) · 곧 출발(10분 전) · 예정 */
export type TimetableState = "FINISHED" | "RUNNING" | "CLOSED" | "SOON" | "UPCOMING";

export interface TimetableRow {
  race: ServerRace;
  at: number; // 출발 시각(epoch ms)
  raceNo: number;
  state: TimetableState;
  result: RaceResult | null;
}

export const TIMETABLE_STATE_LABEL: Record<TimetableState, string> = {
  FINISHED: "종료",
  RUNNING: "경주 중",
  CLOSED: "마감",
  SOON: "곧 출발",
  UPCOMING: "예정",
};

/** 서버 경주 한 줄 — 번호 · 결과는 서버 값(정산되면 SETTLED), 상태는 지금 시각으로 정한다. 정산 전까지는 "경주 중" */
export function timetableRow(race: ServerRace, now: number): TimetableRow {
  const at = race.startsAt;
  const result = raceResult(race);
  let state: TimetableState;
  if (result) state = "FINISHED";
  else if (at <= now) state = "RUNNING";
  else if (now >= at - RACE_GATE_CLOSE_MS) state = "CLOSED";
  else if (at - now <= RACE_SOON_MS) state = "SOON";
  else state = "UPCOMING";
  return { race, at, raceNo: race.raceNo, state, result };
}

/** 그날(KST date)의 경주 — 이른 순 */
export function racesOn(date: string, races: ServerRace[]): ServerRace[] {
  return races.filter((r) => kstDate(r.startsAt) === date).sort((a, b) => a.startsAt - b.startsAt);
}

/** 날짜(KST) → 그날 경주 수 — 달력 칸 표시용 */
export function raceCountByDate(races: ServerRace[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of races) {
    const date = kstDate(r.startsAt);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

/** "YYYY-MM" 달력의 칸 — 일요일 시작, 그 달 첫날 앞은 null 로 채운다 */
export function monthCells(month: string): (string | null)[] {
  const first = `${month}-01`;
  const cells: (string | null)[] = Array.from({ length: dayOfWeek(first) }, () => null);
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) cells.push(date);
  return cells;
}

/** "YYYY-MM" 에 delta 달을 더한다 */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}
