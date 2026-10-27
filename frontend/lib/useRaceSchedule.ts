"use client";

import { useSyncExternalStore } from "react";
import { raceScheduleStore } from "./raceSchedule";

// 경주 일정 구독 — 관리자가 경주를 추가 · 삭제하거나 경주가 정산되면 다음 갱신(30초 · 화면이 다시 보일 때 · refresh) 때 따라간다.
// 하이드레이션 동안에는 빈 일정(loaded: false)이라 정적 셸과 맞는다.
// 일정 계산(lib/time.ts)은 저장소를 직접 읽으므로, 이 훅은 경주 목록을 그리는 곳(/race · 메인 출전마)에서 쓴다.

/** 오늘(KST 0시)부터의 경주, 이른 순 */
export function useRaceSchedule() {
  return useSyncExternalStore(raceScheduleStore.subscribe, raceScheduleStore.get, raceScheduleStore.getServer);
}
