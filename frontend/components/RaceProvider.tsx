"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { RaceBet, RacePhase, RaceResult, RaceRun } from "@/app/(site)/race/_types";

// 레이스 진행 상태 Context — 쿠폰을 건 뒤 다른 페이지를 여러 곳 다녀와도 내 선택이 남도록 루트에 둔다(사용자 결정).
// /race 페이지는 Activity 로 최근 3개 경로까지만 남으므로, 페이지 State 에 두면 쿠폰만 빠지고 선택이 사라질 수 있다.
// React State 에만 두므로 새로고침하면 초기화된다(쿠폰과 같은 프로토타입 수준).
// 쿠폰 차감 · 서비스 호출은 race/_hooks/useRace.ts 가 하고, 여기는 단계 전환만 맡는다.
// 8단계: 경주 진행 상태(run)는 매 프레임 바뀌므로 State 가 아니라 ref 에 둔다 — Context 소비자를 매 프레임 다시 그리지 않고,
// 페이지가 숨겨졌다(Activity) 돌아오거나 다시 마운트돼도 여기서 이어 간다. 그리기용 스냅샷은 useRaceRun 의 로컬 State.

interface Session {
  phase: RacePhase;
  bet: RaceBet | null; // 이번 경주에 건 말
  ranking: number[] | null; // 이번 경주 도착 순서(FINISHED 에서 확정) — 9단계 정산 · 결과 모달이 쓴다
  results: RaceResult[]; // 이 세션에 끝난 경주(최신순) — 9단계에서 채운다
}

export interface RaceSessionState extends Session {
  /** BETTING → READY. 이미 건 경주가 있으면 false(같은 틱에 두 번 불려도 한 번만) */
  enterGate: (bet: RaceBet) => boolean;
  /** READY → RUNNING — 출발 준비된 시뮬레이션 상태를 받아 둔다. READY 가 아니면 false */
  startRace: (run: RaceRun) => boolean;
  /** RUNNING → FINISHED — 7마리 도착 순서. RUNNING 이 아니면 false(두 번 불려도 한 번만) */
  finishRace: (ranking: number[]) => boolean;
  /** 진행 중인 경주의 시뮬레이션 상태 — rAF 루프가 읽고 쓴다(RUNNING · FINISHED 에서만 값이 있다) */
  runRef: MutableRefObject<RaceRun | null>;
}

const RaceContext = createContext<RaceSessionState | null>(null);

const INITIAL: Session = { phase: "BETTING", bet: null, ranking: null, results: [] };

export function RaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL);
  const sessionRef = useRef(session);
  const runRef = useRef<RaceRun | null>(null);

  /** 단계 전환은 모두 여기로 — ref 로 현재 단계를 확인해 같은 틱의 중복 호출을 막는다 */
  const transition = useCallback((from: RacePhase, patch: Partial<Session>) => {
    if (sessionRef.current.phase !== from) return false;
    const next: Session = { ...sessionRef.current, ...patch };
    sessionRef.current = next;
    setSession(next);
    return true;
  }, []);

  const enterGate = useCallback((bet: RaceBet) => transition("BETTING", { phase: "READY", bet }), [transition]);

  const startRace = useCallback(
    (run: RaceRun) => {
      if (sessionRef.current.phase !== "READY") return false;
      runRef.current = run;
      return transition("READY", { phase: "RUNNING", ranking: null });
    },
    [transition],
  );

  const finishRace = useCallback((ranking: number[]) => transition("RUNNING", { phase: "FINISHED", ranking }), [transition]);

  const value = useMemo(
    () => ({ ...session, enterGate, startRace, finishRace, runRef }),
    [session, enterGate, startRace, finishRace],
  );

  return <RaceContext.Provider value={value}>{children}</RaceContext.Provider>;
}

export function useRaceSession(): RaceSessionState {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRaceSession 은 RaceProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
