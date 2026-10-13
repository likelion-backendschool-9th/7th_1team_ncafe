"use client";

import { useSyncExternalStore } from "react";
import { eventStore } from "../_lib/eventStore";
import type { CafeEvent } from "../_types";

/**
 * 이벤트 목록 구독(전체 — 노출 여부는 eventStatus 로 거른다). 관리자가 바꾸면 같은 브라우저의 화면이 바로 따라간다(다른 탭은 storage 이벤트로).
 * 하이드레이션 동안에는 기본 목록이라 정적 셸과 맞고, 직후 저장된 목록으로 바뀐다. 값은 읽기 전용으로 쓴다(쓰기는 eventService).
 * 백엔드가 붙으면 getEvents() 를 불러오는 훅으로 바뀐다.
 */
export function useEvents(): readonly CafeEvent[] {
  return useSyncExternalStore(eventStore.subscribe, eventStore.get, eventStore.getServer);
}
