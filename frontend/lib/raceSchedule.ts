// 경주 일정 — 서버의 오늘(KST 0시)부터의 경주(GET /api/v1/races/schedule)를 브라우저에서 들고 있는 저장소. lib/time.ts 의 일정 계산이 여기서 시각을 읽는다.
// 경주는 관리자(/admin/race 달력)가 날짜 · 시각을 골라 하나씩 추가 · 삭제한다(사용자 결정 2026-10-27).
// 30초마다 · 창이 다시 보일 때 다시 불러오고, 마감(시드 공개) · 정산처럼 바로 알아야 하는 순간에는 화면(useRace · RaceSettlement)이 refresh() 한다.
// 서버 렌더 · 하이드레이션 동안 · 받기 전에는 빈 일정이다. React 는 lib/useRaceSchedule.ts 로 구독한다.
import { getRaceSchedule } from "@/app/(site)/race/_lib/raceService";
import type { ServerRace } from "@/app/(site)/race/_types";
import { createRemoteStore } from "./remoteStore";

const EMPTY: ServerRace[] = [];

export const raceScheduleStore = createRemoteStore(getRaceSchedule, EMPTY, 30_000);

let cache: { races: readonly ServerRace[]; starts: number[] } | null = null;

/** 경주 출발 시각(epoch ms, 이른 순) — 일정이 바뀌기 전까지 같은 배열이다 */
export function raceStarts(): readonly number[] {
  const races = raceScheduleStore.get().data;
  if (cache?.races !== races) cache = { races, starts: races.map((r) => r.startsAt) };
  return cache.starts;
}
