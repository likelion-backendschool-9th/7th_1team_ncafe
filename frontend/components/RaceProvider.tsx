"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { RaceBet, RaceResult, RaceRun } from "@/app/(site)/race/_types";

// 레이스 진행 상태 Context — 쿠폰을 건 뒤 다른 페이지를 여러 곳 다녀와도 내 선택이 남도록 루트에 둔다(사용자 결정).
// /race 페이지는 Activity 로 최근 3개 경로까지만 남으므로, 페이지 State 에 두면 쿠폰만 빠지고 선택이 사라질 수 있다.
// React State 에만 두므로 새로고침하면 초기화된다(쿠폰과 같은 프로토타입 수준).
// 경주의 단계(출발 전 · 경주 중 · 종료)는 여기 있지 않다 — 경주 시각(lib/time)과 시계로 정해지며 race/_hooks/useRace.ts 가 계산한다
// (사용자 결정 2026-10-13: 모두 같은 시각에 출발 · 종료). 여기는 "내가 건 말" 과 "이 세션에서 끝난 경주" 만 들고 있다.
// 진행 중 시뮬레이션(run)은 매 프레임 바뀌므로 State 가 아니라 ref — Context 소비자를 매 프레임 다시 그리지 않고,
// 페이지가 숨겨졌다(Activity) 돌아오거나 다시 마운트돼도 여기서 이어 간다. 그리기용 스냅샷은 useRaceRun 의 로컬 State.

interface Session {
  bets: Record<number, RaceBet>; // raceNo → 내가 건 말(한 경주에 한 번)
  results: RaceResult[]; // 이 세션에서 끝까지 본 경주(최신순) — 지나간 경주는 useRace 가 결정적 시뮬레이션으로 보충한다
}

export interface RaceSessionState extends Session {
  /** 그 경주에 아직 걸지 않았으면 기록하고 true(같은 틱에 두 번 불려도 한 번만) */
  placeBet: (bet: RaceBet) => boolean;
  /** 끝난 경주를 맨 앞에 추가. 같은 번호가 이미 있으면 false(두 번 불려도 한 번만) */
  recordResult: (result: RaceResult) => boolean;
  /** 진행 중인 경주의 시뮬레이션 상태 — rAF 루프가 읽고 쓴다 */
  runRef: RefObject<RaceRun | null>;
}

const RaceContext = createContext<RaceSessionState | null>(null);

const INITIAL: Session = { bets: {}, results: [] };

export function RaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL);
  const sessionRef = useRef(session);
  const runRef = useRef<RaceRun | null>(null);

  const commit = useCallback((next: Session) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const placeBet = useCallback(
    (bet: RaceBet) => {
      const current = sessionRef.current;
      if (current.bets[bet.raceNo]) return false;
      commit({ ...current, bets: { ...current.bets, [bet.raceNo]: bet } });
      return true;
    },
    [commit],
  );

  const recordResult = useCallback(
    (result: RaceResult) => {
      const current = sessionRef.current;
      if (current.results.some((r) => r.raceNo === result.raceNo)) return false;
      commit({ ...current, results: [result, ...current.results] });
      return true;
    },
    [commit],
  );

  const value = useMemo(() => ({ ...session, placeBet, recordResult, runRef }), [session, placeBet, recordResult]);

  return <RaceContext.Provider value={value}>{children}</RaceContext.Provider>;
}

export function useRaceSession(): RaceSessionState {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRaceSession 은 RaceProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
