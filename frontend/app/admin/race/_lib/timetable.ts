// 관리자 경주 현황 — 오늘 · 내일의 경주표(번호 · 상태 · 결과). 순수 함수.
import { nextRaceNo } from "@/app/(site)/race/_lib/records";
import type { RaceResult } from "@/app/(site)/race/_types";
import { getRaceStartsBetween, kstMidnight, RACE_GATE_CLOSE_MS, RACE_SOON_MS } from "@/lib/time";

/** 종료(결과 있음) · 경주 중(출발했고 결과 전) · 마감(출발 10초 전) · 곧 출발(10분 전) · 예정 */
export type TimetableState = "FINISHED" | "RUNNING" | "CLOSED" | "SOON" | "UPCOMING";

export interface TimetableRow {
  at: number; // 출발 시각(epoch ms)
  day: "TODAY" | "TOMORROW";
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

const DAY = 24 * 60 * 60 * 1000;

/**
 * 오늘 · 내일 열리는 경주(시간표 기준) — 끝난 경주는 기록의 번호 · 결과, 아직인 경주는 /race 와 같은 규칙으로 다음 번호부터 차례로.
 * history 는 /race 와 같은 기록(useRaceHistory — 이 세션에서 본 경주 + 지나간 경주 보충 + Mock).
 */
export function buildTimetable(now: number, history: RaceResult[]): TimetableRow[] {
  const today = kstMidnight(now);
  let no = nextRaceNo(history);
  return getRaceStartsBetween(today - 1, today + 2 * DAY - 1).map((at): TimetableRow => {
    const day = at < today + DAY ? "TODAY" : "TOMORROW";
    const result = history.find((r) => Date.parse(r.date) === at) ?? null;
    if (result) return { at, day, raceNo: result.raceNo, state: "FINISHED", result };
    const state: TimetableState =
      at <= now ? "RUNNING" : now >= at - RACE_GATE_CLOSE_MS ? "CLOSED" : at - now <= RACE_SOON_MS ? "SOON" : "UPCOMING";
    return { at, day, raceNo: no++, state, result: null };
  });
}
