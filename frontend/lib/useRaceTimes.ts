"use client";

import { useSyncExternalStore } from "react";
import { announcedRaceTimes, raceScheduleStore, type RaceScheduleVersion } from "./raceSchedule";

// 경주 시간표 구독 — 관리자(/admin/race)가 바꾸면 같은 브라우저의 화면이 바로 따라간다(다른 탭은 storage 이벤트로).
// 하이드레이션 동안에는 기본 시간표(서버 값)라 정적 셸과 맞고, 직후 저장된 시간표로 바뀐다.
// 일정 계산(lib/time.ts)은 저장소를 직접 읽으므로, 이 훅은 "시각 목록을 글자로 그리는 곳"과 관리자 화면에서만 쓴다.

/** 시간표 변경 이력(오래된 순) */
export function useRaceScheduleVersions(): readonly RaceScheduleVersion[] {
  return useSyncExternalStore(raceScheduleStore.subscribe, raceScheduleStore.get, raceScheduleStore.getServer);
}

/** 지금 공지된 시간표(이른 순) — "매일 12:30 · 18:00" */
export function useRaceTimes(): readonly string[] {
  return announcedRaceTimes(useRaceScheduleVersions());
}
