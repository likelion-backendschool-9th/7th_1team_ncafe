"use client";

import { useSyncExternalStore } from "react";

// 1분 시계 — 예약 가능한 날짜(KST 오늘) · 지나간 시간대 · 진행 중 시간대 판정은 분 단위면 충분하다.
// lib/useCountdown 의 1초 시계를 쓰면 배치도(의자 71개)가 매초 다시 그려지므로 따로 둔다.
// 마운트 전(정적 셸 · 하이드레이션)에는 null — 달력 · 시간대는 시각을 안 뒤에 그린다.

let now: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);
}

function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
  schedule();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    schedule();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

const getNow = () => now;
const getServerNow = () => null;

/** 지금(epoch ms), 분이 바뀔 때만 갱신 — 마운트 전에는 null */
export function useMinuteClock(): number | null {
  return useSyncExternalStore(subscribe, getNow, getServerNow);
}
