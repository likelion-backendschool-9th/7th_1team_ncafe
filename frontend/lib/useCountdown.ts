"use client";

import { useSyncExternalStore } from "react";
import { kstDate } from "./kst";
import { COUNTDOWN_PLACEHOLDER, formatCountdown, getRaceSchedule, type RacePhase, type RaceSchedule } from "./time";

// 1초 시계 — 메인 히어로 · /race · Header 가 하나를 함께 구독한다(타이머도 하나).
// 서버 렌더 · 빌드 때 미리 렌더 · 하이드레이션 동안에는 시각을 읽지 않고 null 을 돌려준다(getServerSnapshot).
// 그래서 정적 셸과 첫 클라이언트 렌더가 같고(하이드레이션 경고 없음), 마운트 직후 실제 시각으로 바뀐다.
// 구독은 effect 라 Activity 로 숨겨진 페이지는 구독을 풀고, 다시 보이면 새 시각으로 이어진다.

let now: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

/** 다음 초 경계 직후에 깨어나도록(초가 바뀌는 순간에 맞춰 숫자가 넘어가게) */
function schedule() {
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
  schedule();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    // 첫 구독자 — 시계를 맞추고 타이머를 건다. React 가 구독 직후 값을 다시 확인해 새 시각으로 그린다.
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
const getPhase = () => (now === null ? null : getRaceSchedule(now).phase);
const getToday = () => (now === null ? null : kstDate(now));
const getServerNow = () => null;

/** 지금(epoch ms) — 마운트 전에는 null */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getNow, getServerNow);
}

/** 경주 일정 + "01:24:32" — 마운트 전에는 schedule null · countdown "--:--:--" */
export function useRaceCountdown(): { schedule: RaceSchedule | null; countdown: string } {
  const current = useNow();
  if (current === null) return { schedule: null, countdown: COUNTDOWN_PLACEHOLDER };
  const schedule = getRaceSchedule(current);
  return { schedule, countdown: formatCountdown(schedule.remainingMs) };
}

/** 단계만(UPCOMING · SOON · LIVE) — 값이 바뀔 때만 다시 그린다(Header 처럼 숫자가 필요 없는 곳) */
export function useRacePhase(): RacePhase | null {
  return useSyncExternalStore(subscribe, getPhase, getServerNow);
}

/** 오늘(KST "YYYY-MM-DD")만 — 날짜가 바뀔 때만 다시 그린다(이벤트 진행 상태처럼 날짜 단위인 곳). 마운트 전에는 null */
export function useKstToday(): string | null {
  return useSyncExternalStore(subscribe, getToday, getServerNow);
}
