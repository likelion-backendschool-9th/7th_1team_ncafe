"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRaceSession } from "@/components/RaceProvider";
import type { RemoteStore } from "@/lib/remoteStore";
import { mergeHistory, raceResult } from "../_lib/records";
import { adminRacesStore, horsesStore, losingStreakStore, myBetsStore, raceHistoryStore } from "../_lib/raceStores";
import type { RaceResult } from "../_types";

// 레이스 서버 데이터 구독 훅 — /race · 메인 · /my · /admin/race 가 함께 쓴다(같은 저장소라 요청도 하나).
// 하이드레이션 동안에는 빈 값(loaded: false)이라 정적 셸과 맞고, 마운트 직후 서버 값으로 바뀐다.

function useStore<T>(store: RemoteStore<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

/** 출전마 7마리(말 id 순) */
export function useRaceHorses() {
  return useStore(horsesStore);
}

/** 내 걸기 기록(최신순, 로그인하지 않았으면 빈 목록) */
export function useMyBets() {
  return useStore(myBetsStore);
}

/** 내 연패 위로 쿠폰 상태(로그인하지 않았으면 null) */
export function useLosingStreak() {
  return useStore(losingStreakStore);
}

/** 관리자 경주 목록(모든 경주, 최신순) */
export function useAdminRaces() {
  return useStore(adminRacesStore);
}

/**
 * 경주 기록 = 서버의 정산된 경주 + 이 세션에서 끝까지 본 경주(RaceProvider.results — 서버 정산보다 먼저 결과가 보인다), 최신순.
 * 같은 번호면 서버 값이 이긴다. races 는 서버 경주 그대로(그 경주 당시 게이트 번호를 그릴 때 쓴다).
 */
export function useRaceHistory() {
  const session = useRaceSession();
  const state = useStore(raceHistoryStore);
  const history = useMemo(
    () => mergeHistory(state.data.map(raceResult).filter((r): r is RaceResult => r !== null), session.results),
    [session.results, state.data],
  );
  return { session, history, races: state.data, loaded: state.loaded, error: state.error };
}
