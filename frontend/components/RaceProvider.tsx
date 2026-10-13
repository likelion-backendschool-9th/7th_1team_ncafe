"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { RaceResult, RaceRun } from "@/app/(site)/race/_types";

// 레이스 진행 상태 Context — 다른 페이지를 여러 곳 다녀와도 경주 진행 · 결과가 이어지도록 루트에 둔다(사용자 결정).
// /race 페이지는 Activity 로 최근 3개 경로까지만 남으므로, 페이지 State 에 두면 다녀오는 사이 사라질 수 있다.
// React State 에만 두므로 새로고침하면 초기화된다(쿠폰과 같은 프로토타입 수준).
// 경주의 단계(출발 전 · 경주 중 · 종료)는 여기 있지 않다 — 경주 시각(lib/time)과 시계로 정해지며 race/_hooks/useRace.ts 가 계산한다
// (사용자 결정 2026-10-13: 모두 같은 시각에 출발 · 종료). 내가 건 말은 "내 것"이라 UserProvider 의 races 에 있다(9단계).
// 여기는 "이 세션에서 확정된 경주" 와 "결과 모달을 어디까지 띄웠나" 만 들고 있다.
// 진행 중 시뮬레이션(run)은 매 프레임 바뀌므로 State 가 아니라 ref — Context 소비자를 매 프레임 다시 그리지 않고,
// 페이지가 숨겨졌다(Activity) 돌아오거나 다시 마운트돼도 여기서 이어 간다. 그리기용 스냅샷은 useRaceRun 의 로컬 State.

interface Session {
  /** 이 세션에서 확정된 경주(최신순) — /race 에서 끝까지 본 경주 + 내가 건 경주의 결과(RaceSettlement).
   *  나머지 지나간 경주는 useRace 가 결정적 시뮬레이션으로 보충한다 */
  results: RaceResult[];
  /** 결과 모달을 이미 띄운 마지막 경주 번호 — 이보다 뒤에 정산된 내 경주가 있으면 /race 에서 한 번 띄운다 */
  resultSeenUpTo: number;
}

export interface RaceSessionState extends Session {
  /** 끝난 경주를 맨 앞에 추가. 같은 번호가 이미 있으면 false(두 번 불려도 한 번만) */
  recordResult: (result: RaceResult) => boolean;
  /** 이 경주 번호까지의 결과 모달을 본 것으로 표시 */
  markResultSeen: (raceNo: number) => void;
  /** 진행 중인 경주의 시뮬레이션 상태 — rAF 루프가 읽고 쓴다 */
  runRef: RefObject<RaceRun | null>;
}

const RaceContext = createContext<RaceSessionState | null>(null);

const INITIAL: Session = { results: [], resultSeenUpTo: 0 };

export function RaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL);
  const sessionRef = useRef(session);
  const runRef = useRef<RaceRun | null>(null);

  const commit = useCallback((next: Session) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const recordResult = useCallback(
    (result: RaceResult) => {
      const current = sessionRef.current;
      if (current.results.some((r) => r.raceNo === result.raceNo)) return false;
      commit({ ...current, results: [result, ...current.results] });
      return true;
    },
    [commit],
  );

  const markResultSeen = useCallback(
    (raceNo: number) => {
      const current = sessionRef.current;
      if (raceNo <= current.resultSeenUpTo) return;
      commit({ ...current, resultSeenUpTo: raceNo });
    },
    [commit],
  );

  const value = useMemo(() => ({ ...session, recordResult, markResultSeen, runRef }), [session, recordResult, markResultSeen]);

  return <RaceContext.Provider value={value}>{children}</RaceContext.Provider>;
}

export function useRaceSession(): RaceSessionState {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRaceSession 은 RaceProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
