"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RemoteStore } from "@/lib/remoteStore";
import { adminEventsStore, eventsStore, myAppliesStore } from "../_lib/eventStore";
import type { EventApply } from "../_types";

// 이벤트 서버 데이터 구독 훅 — 하이드레이션 동안에는 빈 값(loaded: false)이라 정적 셸과 맞고, 마운트 직후 서버 값으로 바뀐다.

function useStore<T>(store: RemoteStore<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

/** 손님 화면 이벤트 목록(진행 중 · 노출 허가) — { data, loaded, error } */
export function useEvents() {
  return useStore(eventsStore);
}

/** 관리자 이벤트 목록(숨긴 이벤트 포함) — ADMIN 확인 뒤에만 쓴다 */
export function useAdminEvents() {
  return useStore(adminEventsStore);
}

const NO_APPLIES: EventApply[] = [];

/** 내 신청 기록, 최신순 — 로그인하지 않았으면(memberNo null) 빈 목록. 로그인한 회원이 바뀌면 다시 불러온다 */
export function useMyApplies(memberNo: number | null): { data: EventApply[]; loaded: boolean } {
  const state = useStore(myAppliesStore);
  useEffect(() => {
    void myAppliesStore.refresh();
  }, [memberNo]);
  return memberNo === null ? { data: NO_APPLIES, loaded: state.loaded } : { data: state.data, loaded: state.loaded };
}
