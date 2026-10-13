"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRaceSession } from "@/components/RaceProvider";
import { useUser } from "@/components/UserProvider";
import { RACE_ENTRY_COUPONS } from "../_lib/payout";
import { placeBet } from "../_lib/raceService";
import { nextRaceNo } from "../_lib/records";
import { advanceTo, createRace, leaderProgress, liveOrder } from "../_lib/simulation";
import type { SceneFrame, TrackScene } from "../_lib/trackScene";
import type { Horse, RaceEventMessage, RaceResult, RaceRun } from "../_types";

export type BetOutcome = "OK" | "NO_COUPON" | "CLOSED" | "BUSY";

/** [경주 시작] 을 누르고 출발까지 — 3 · 2 · 1 */
export const RACE_COUNTDOWN_MS = 3000;
/** 마지막 말이 들어온 뒤 이만큼 더 보여 주고 FINISHED 로 */
const FINISH_HOLD_MS = 1500;
/** 이벤트 토스트 하나를 보여 주는 시간 · 이보다 오래된 메시지는 버린다 */
const TOAST_MS = 1500;
const TOAST_STALE_MS = 3000;
/** React(HUD · 카운트다운) 갱신 간격 — 캔버스는 매 프레임, DOM 은 이 간격(또는 순위가 바뀔 때) */
const HUD_INTERVAL_MS = 100;

/**
 * /race 진행 — 상태는 RaceProvider(루트)에 있고, 여기서는 기록 합치기 · 경주 번호 · 쿠폰 걸기 · 출발을 맡는다.
 * baseHistory 는 page 가 Service 에서 받은 지난 기록, 이 세션에 끝난 경주(results)는 그 앞에 붙는다.
 * BETTING → READY(쿠폰 1장 차감) → RUNNING(startRace). rAF 루프는 useRaceRun(트랙 전용), FINISHED 뒤는 9단계.
 */
export function useRace(baseHistory: RaceResult[]) {
  const session = useRaceSession();
  const { coupons, spendCoupon } = useUser();
  const placing = useRef(false);

  const history = useMemo(() => [...session.results, ...baseHistory], [session.results, baseHistory]);
  // 걸고 나면 그 경주 번호로 고정, 아니면 기록의 다음 번호
  const raceNo = session.bet?.raceNo ?? nextRaceNo(history);
  const canBet = session.phase === "BETTING" && coupons >= RACE_ENTRY_COUPONS;

  /** 확인창의 [사용하기] — placeBet → 쿠폰 1장 차감(내역 기록) → READY */
  async function confirmBet(horse: Horse): Promise<BetOutcome> {
    if (placing.current) return "BUSY";
    if (session.phase !== "BETTING") return "CLOSED";
    if (coupons < RACE_ENTRY_COUPONS) return "NO_COUPON";
    placing.current = true;
    try {
      const bet = await placeBet(raceNo, horse.id);
      if (!spendCoupon("RACE_BET", `Race #${raceNo} · ${horse.id}번 ${horse.name.toUpperCase()} 참가`)) return "NO_COUPON";
      session.enterGate(bet);
      return "OK";
    } finally {
      placing.current = false;
    }
  }

  /**
   * [경주 시작] — 지금부터 RACE_COUNTDOWN_MS 뒤를 출발 시각으로 잡고 RUNNING 으로.
   * 진행은 출발 시각 기준 경과 시간으로 계산하므로 카운트다운 중에 페이지를 떠나도 경주는 그대로 흘러간다.
   */
  function startRace(horses: Horse[]): boolean {
    if (session.phase !== "READY") return false;
    return session.startRace(createRace(horses, raceNo, Date.now() + RACE_COUNTDOWN_MS));
  }

  return { phase: session.phase, bet: session.bet, history, raceNo, coupons, canBet, confirmBet, startRace };
}

/** DOM(머리띠 · HUD · 카운트다운)이 쓰는 한 프레임의 스냅샷 — 캔버스가 쓰는 SceneFrame 에 순위 · 경과를 더한 것 */
export interface RaceFrame extends SceneFrame {
  elapsed: number; // 출발 기준 경과 ms — 카운트다운 중에는 음수
  order: number[]; // 현재 순위(horseId)
  doneAt: number | null;
}

function toFrame(run: RaceRun, elapsed: number): RaceFrame {
  return {
    elapsed,
    leader: leaderProgress(run.runners),
    runners: run.runners.map((r) => ({ horseId: r.horseId, progress: r.progress, finishedAt: r.finishedAt })),
    running: elapsed >= 0 && run.doneAt === null,
    order: liveOrder(run.runners),
    doneAt: run.doneAt,
  };
}

/** 출발선에 선 7마리(READY · 장면을 처음 그릴 때) */
export function lineupFrame(horses: Horse[]): RaceFrame {
  return {
    elapsed: Number.NEGATIVE_INFINITY,
    leader: 0,
    runners: horses.map((h) => ({ horseId: h.id, progress: 0, finishedAt: null })),
    running: false,
    order: horses.map((h) => h.id),
    doneAt: null,
  };
}

/** 결승선에 들어온 7마리(FINISHED 인데 스냅샷이 없을 때 — 페이지를 오래 떠났다 다시 마운트된 경우) */
export function finishedFrame(horses: Horse[], ranking: number[]): RaceFrame {
  return {
    elapsed: Number.POSITIVE_INFINITY,
    leader: 1,
    runners: horses.map((h) => ({ horseId: h.id, progress: 1, finishedAt: ranking.indexOf(h.id) })),
    running: false,
    order: ranking,
    doneAt: 0,
  };
}

/** 한 경주의 DOM 용 상태 — 경주 번호를 같이 들고 있어 다음 경주(READY)에서는 지난 스냅샷을 쓰지 않는다 */
interface LiveState {
  raceNo: number;
  frame: RaceFrame;
  message: RaceEventMessage | null;
}

/**
 * RUNNING 동안 rAF 루프를 돌려 캔버스 장면(scene)을 매 프레임 갱신하고, DOM 용 스냅샷 · 이벤트 토스트를 돌려준다(HorseTrack 전용).
 * - 시뮬레이션 상태는 RaceProvider 의 runRef 에 있고, 매 프레임 "출발 시각 기준 경과 시간"까지 advanceTo 로 따라잡는다.
 *   그래서 다른 페이지에 갔다 오거나(Activity 가 effect 를 정리해 rAF 가 멈춘다) 탭이 뒤로 가도 돌아오면 그 시각의 상태로 이어진다.
 * - 캔버스는 매 프레임, React State 는 순위 · 토스트가 바뀌거나 HUD_INTERVAL_MS 마다만 갱신한다(DOM 을 60fps 로 다시 그리지 않게).
 * - 7마리가 모두 들어오고 FINISH_HOLD_MS 가 지나면 finishRace 로 FINISHED(경주당 한 번만 — Provider 가 단계를 확인한다).
 * - 토스트는 한 번에 하나, TOAST_MS 씩. 시뮬레이션이 메시지 간격을 같은 값으로 제한하므로 큐가 밀리지 않는다.
 * - 스냅샷이 없는 FINISHED(페이지가 다시 마운트된 경우)는 호출한 쪽이 session.ranking 으로 finishedFrame 을 만든다.
 */
export function useRaceRun(
  horses: Horse[],
  raceNo: number,
  scene: RefObject<TrackScene | null>,
): { frame: RaceFrame | null; message: RaceEventMessage | null } {
  const { phase, runRef, finishRace } = useRaceSession();
  const [live, setLive] = useState<LiveState | null>(null);
  const queue = useRef<RaceEventMessage[]>([]);
  const shown = useRef<{ id: string; at: number } | null>(null);

  const nameOf = useCallback(
    (horseId: number) => horses.find((h) => h.id === horseId)?.name.toUpperCase() ?? String(horseId),
    [horses],
  );

  useEffect(() => {
    if (phase !== "RUNNING") return;
    let raf = 0;
    let lastHudAt = Number.NEGATIVE_INFINITY;
    let lastOrder = "";
    let message: RaceEventMessage | null = null;
    // 다시 보일 때(Activity) 숨겨진 동안 쌓인 메시지는 버린다
    queue.current = [];
    shown.current = null;

    const tick = () => {
      const run = runRef.current;
      if (!run) return;
      const elapsed = Date.now() - run.startedAt;
      const { run: next, events } = advanceTo(run, elapsed, Math.random, nameOf);
      runRef.current = next;

      const snapshot = toFrame(next, elapsed);
      scene.current?.update(snapshot);

      let changed = false;
      if (events.length) queue.current.push(...events);
      if (!shown.current || elapsed - shown.current.at >= TOAST_MS) {
        let candidate = queue.current.shift();
        while (candidate && elapsed - candidate.at > TOAST_STALE_MS) candidate = queue.current.shift();
        if (candidate || shown.current) {
          shown.current = candidate ? { id: candidate.id, at: elapsed } : null;
          message = candidate ?? null;
          changed = true;
        }
      }

      const orderKey = snapshot.order.join(",");
      if (orderKey !== lastOrder || elapsed - lastHudAt >= HUD_INTERVAL_MS) {
        lastOrder = orderKey;
        lastHudAt = elapsed;
        changed = true;
      }

      const done = next.doneAt !== null && next.elapsed - next.doneAt >= FINISH_HOLD_MS;
      if (done) message = null;
      if (changed || done) setLive({ raceNo: next.raceNo, frame: snapshot, message });

      if (done) {
        finishRace(next.ranking);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, runRef, finishRace, nameOf, scene]);

  // 지난 경주의 상태는 쓰지 않는다 — 번호가 다르거나 BETTING 이면 없음, 토스트는 RUNNING 에서만
  const current = live && live.raceNo === raceNo && phase !== "BETTING" ? live : null;
  return { frame: current?.frame ?? null, message: phase === "RUNNING" ? (current?.message ?? null) : null };
}
