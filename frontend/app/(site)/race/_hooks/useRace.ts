"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRaceSession } from "@/components/RaceProvider";
import { useUser } from "@/components/UserProvider";
import { getRaceSchedule, RACE_GATE_CLOSE_MS } from "@/lib/time";
import { useNow } from "@/lib/useCountdown";
import type { RaceEntry } from "@/types/common";
import { raceHorsesAt } from "../_lib/horseStore";
import { RACE_ENTRY_COUPONS } from "../_lib/payout";
import { placeBet as requestBet } from "../_lib/raceService";
import { backfillHistory, gatesFor, latestRaceAt, mergeHistory, nextRaceNo, settledRaceUntil } from "../_lib/records";
import { advanceTo, createRace, FINISH_HOLD_MS, liveOrder, STEP_MS } from "../_lib/simulation";
import type { SceneFrame, TrackScene } from "../_lib/trackScene";
import type { Gates, Horse, RaceEventMessage, RaceResult, RaceRun, RaceStage } from "../_types";

export type BetOutcome = "OK" | "NO_COUPON" | "CLOSED" | "BUSY";
/** 걸 수 없는 이유 — 출전표 위 안내문 · 버튼 비활성 */
export type BetLock = "GATE_CLOSED" | "NO_COUPON" | null;

/** 출발 전 이만큼은 3 · 2 · 1 카운트다운 */
export const RACE_COUNTDOWN_MS = 3000;
/** 이벤트 토스트 하나를 보여 주는 시간 · 이보다 오래된 메시지는 버린다 */
const TOAST_MS = 1500;
const TOAST_STALE_MS = 3000;
/** React(HUD · 카운트다운) 갱신 간격 — 캔버스는 매 프레임, DOM 은 이 간격(또는 순위가 바뀔 때) */
const HUD_INTERVAL_MS = 100;

/**
 * 경주 기록 = 이 세션에서 본 경주(RaceProvider.results) + 지나간 경주 자동 보충(결정적 시뮬레이션) + Mock 기록, 최신순.
 * /race(useRace)와 관리자 경주 관리(/admin/race)가 함께 쓴다. 시계(now)도 같이 돌려준다 — 마운트 전에는 null.
 */
export function useRaceHistory(baseHistory: RaceResult[]) {
  const session = useRaceSession();
  const now = useNow();
  // 지나간 경주 보충 — "확실히 끝난 마지막 출발 시각"이 바뀔 때만 다시 계산한다(1초 시계가 흘러도 메모 유지).
  // 출전마는 그 경주 당시의 것(raceHorsesAt) — 관리자가 성향을 바꿔도 이미 끝난 경주의 결과는 그대로다
  const baseLatestAt = useMemo(() => latestRaceAt(baseHistory), [baseHistory]);
  const settledUntil = now === null ? baseLatestAt : settledRaceUntil(baseLatestAt, now);
  const backfilled = useMemo(() => backfillHistory(baseHistory, raceHorsesAt, settledUntil), [baseHistory, settledUntil]);
  const history = useMemo(() => mergeHistory(session.results, backfilled, baseHistory), [session.results, backfilled, baseHistory]);
  return { session, history, now };
}

/**
 * /race 진행 — 단계는 사용자의 버튼이 아니라 **경주 시각과 시계**로 정해진다(사용자 결정 2026-10-13: 모두 동시에 출발 · 종료).
 * - 기록 = 이 세션에서 본 경주(RaceProvider.results) + 지나간 경주 자동 보충(결정적 시뮬레이션) + Mock 기록. 다음 경주 번호는 그 다음 번호.
 * - 무대(stage): LIVE 창(출발 뒤 10분)이고 그 경주 결과가 아직 없으면 RUNNING, 있으면 FINISHED. 그 밖에는 다음 경주를 기다리는 WAIT
 *   (쿠폰을 걸었거나 SOON 이면 무대를 보여 준다). 출발 RACE_GATE_CLOSE_MS 전부터는 마감이라 걸 수 없고 관람만 한다.
 * - 쿠폰 차감 · 서비스 호출은 여기서 하고, 내가 건 말은 UserProvider(races) · 끝난 경주는 RaceProvider 가 들고 있다.
 * - 정산(결과 → 쿠폰 돌려주기)은 루트의 RaceSettlement 가 어느 페이지에서든 한다. 여기는 정산된 내 경주의 결과 모달을 한 번 띄운다.
 */
export function useRace(baseHistory: RaceResult[], horses: Horse[]) {
  const { coupons, spendCoupon, races, joinRace } = useUser();
  const { session, history, now } = useRaceHistory(baseHistory);
  const placing = useRef(false);
  const betOf = (no: number): RaceEntry | null => races.find((r) => r.raceNo === no) ?? null;

  const raceNo = nextRaceNo(history);
  const schedule = now === null ? null : getRaceSchedule(now);

  let stage: RaceStage | null = null;
  if (now !== null && schedule) {
    const liveAt = schedule.live?.at ?? null;
    const liveResult = liveAt === null ? null : (history.find((r) => Date.parse(r.date) === liveAt) ?? null);
    if (liveAt !== null && liveResult) {
      stage = { kind: "FINISHED", raceNo: liveResult.raceNo, startedAt: liveAt, bet: betOf(liveResult.raceNo), result: liveResult, gateClosed: true };
    } else if (liveAt !== null) {
      stage = { kind: "RUNNING", raceNo, startedAt: liveAt, bet: betOf(raceNo), result: null, gateClosed: true };
    } else {
      const startedAt = schedule.next.at;
      const bet = betOf(raceNo);
      const gateClosed = now >= startedAt - RACE_GATE_CLOSE_MS;
      if (bet || schedule.phase === "SOON") stage = { kind: "WAIT", raceNo, startedAt, bet, result: null, gateClosed };
    }
  }

  // 게이트 번호(BLUEPRINT 8.2 "게이트 번호 규칙") — 출전표는 다음 경주(raceNo), 트랙 무대는 그 무대의 경주(FINISHED 면 방금 끝난 경주).
  // 결과 · 지난 경주 기록은 gatesOf 로 "그 경주 당시 번호"를 그린다(사용자 결정 2026-10-13). history 가 메모돼 있어 1초 시계에도 같은 객체다
  const gates = useMemo(() => gatesFor(raceNo, history, horses), [raceNo, history, horses]);
  const stageRaceNo = stage?.raceNo ?? raceNo;
  const stageGates = useMemo(
    () => (stageRaceNo === raceNo ? gates : gatesFor(stageRaceNo, history, horses)),
    [stageRaceNo, raceNo, gates, history, horses],
  );
  const gatesOf = (no: number): Gates => (no === raceNo ? gates : no === stageRaceNo ? stageGates : gatesFor(no, history, horses));

  const myBet = betOf(raceNo);
  // 걸 수 없는 때: 이미 걸었음 · 마감(출발 10초 전 ~ 경주 끝) · 쿠폰 부족. 시계를 읽기 전(정적 셸)에는 열린 것으로 둔다
  const gateClosed = stage !== null && stage.raceNo === raceNo && (stage.kind === "RUNNING" || stage.gateClosed);
  const lock: BetLock = gateClosed ? "GATE_CLOSED" : coupons < RACE_ENTRY_COUPONS ? "NO_COUPON" : null;
  const canBet = myBet === null && lock === null;

  /** 확인창의 [사용하기] — placeBet → 쿠폰 1장 차감(내역 기록) → 내 레이스 기록에 남김 */
  async function confirmBet(horse: Horse): Promise<BetOutcome> {
    if (placing.current) return "BUSY";
    // 걸 수 있는 경주는 언제나 아직 출발하지 않은 다음 경주(schedule.next) — LIVE 동안에도 그다음 경주다
    if (myBet || gateClosed || !schedule) return "CLOSED";
    if (coupons < RACE_ENTRY_COUPONS) return "NO_COUPON";
    placing.current = true;
    try {
      const bet = await requestBet(raceNo, new Date(schedule.next.at).toISOString(), horse.id);
      // 이 경주의 게이트 번호 — 걸 수 있을 때는 지난 경주 결과가 이미 확정돼 있어 번호가 더 바뀌지 않는다. 내 레이스 기록 · 쿠폰 내역에 그대로 남긴다
      const gate = gates[horse.id];
      if (!spendCoupon("RACE_BET", `Race #${raceNo} · ${gate}번 ${horse.name.toUpperCase()} 참가`)) return "NO_COUPON";
      joinRace(bet, gate);
      return "OK";
    } finally {
      placing.current = false;
    }
  }

  /** 가장 최근에 끝난 경주(결과 섹션) */
  const lastResult = history[0] ?? null;
  const betFor = (result: RaceResult): RaceEntry | null => betOf(result.raceNo);

  // 결과 모달 — 정산된 내 경주 중 아직 띄우지 않은 가장 최근 것. 경주당 한 번, 다른 페이지에 있었다면 /race 로 돌아왔을 때
  const latestSettled = races.find((r) => r.settledAt !== null) ?? null;
  const announcement =
    latestSettled && latestSettled.raceNo > session.resultSeenUpTo
      ? { entry: latestSettled, result: history.find((r) => r.raceNo === latestSettled.raceNo) ?? null }
      : null;
  const dismissAnnouncement = () => {
    if (latestSettled) session.markResultSeen(latestSettled.raceNo);
  };

  return {
    stage,
    history,
    raceNo,
    gates,
    stageGates,
    gatesOf,
    coupons,
    myBet,
    canBet,
    lock,
    confirmBet,
    lastResult,
    betFor,
    announcement,
    dismissAnnouncement,
  };
}

/** DOM(머리띠 · HUD · 카운트다운)이 쓰는 한 프레임의 스냅샷 — 캔버스가 쓰는 SceneFrame 에 순위 · 경과를 더한 것 */
export interface RaceFrame extends SceneFrame {
  elapsed: number; // 출발 기준 경과 ms — 카운트다운 중에는 음수
  order: number[]; // 현재 순위(horseId)
  doneAt: number | null;
}

/**
 * run 은 STEP_MS 단위로만 진행하므로 그 사이는 직전 스텝과 선형 보간해 그린다(elapsed = 그리려는 시각, 보통 run.elapsed ~ +STEP_MS).
 * /race/lab 의 가상 시계도 이 함수로 그린다.
 */
export function toFrame(run: RaceRun, elapsed: number): RaceFrame {
  const alpha = Math.min(1, Math.max(0, (elapsed - run.elapsed) / STEP_MS));
  const runners = run.runners.map((r) => ({
    horseId: r.horseId,
    progress: r.prevProgress + (r.progress - r.prevProgress) * alpha,
    finishedAt: r.finishedAt,
  }));
  return {
    elapsed,
    leader: Math.min(1, Math.max(0, ...runners.map((r) => r.progress))),
    runners,
    running: elapsed >= 0 && run.doneAt === null,
    order: liveOrder(run.runners),
    doneAt: run.doneAt,
  };
}

/** 출발선에 선 7마리(출발 전 · 장면을 처음 그릴 때) */
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

/** 결승선에 들어온 7마리(FINISHED 인데 스냅샷이 없을 때 — 경주를 직접 보지 않았거나 페이지가 다시 마운트된 경우) */
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

/** 한 경주의 DOM 용 상태 — 경주 번호를 같이 들고 있어 다른 경주의 무대에서는 쓰지 않는다 */
interface LiveState {
  raceNo: number;
  frame: RaceFrame;
  message: RaceEventMessage | null;
}

/**
 * 무대가 WAIT · RUNNING 인 동안 루프를 돌려 캔버스 장면(scene)을 매 프레임 갱신하고, DOM 용 스냅샷 · 이벤트 토스트를 돌려준다(HorseTrack 전용).
 * - 출발 RACE_COUNTDOWN_MS 전까지는 타이머로 기다리고(관람 대기), 그 뒤 rAF 로 매 프레임 "출발 시각 기준 경과 시간"까지 advanceTo 로 따라잡는다.
 *   시뮬레이션은 시드 · 고정 간격이라 어느 기기든 같은 경주이고, 다른 페이지에 갔다 오거나(Activity 가 effect 를 정리한다) 늦게 들어와도
 *   그 시각의 상태로 이어진다. 상태는 RaceProvider 의 runRef 에 두고 경주가 바뀌면 새로 만든다.
 * - 캔버스는 매 프레임, React State 는 순위 · 토스트가 바뀌거나 HUD_INTERVAL_MS 마다만 갱신한다.
 * - 7마리가 모두 들어오고 FINISH_HOLD_MS 가 지나면 recordResult 로 끝난 경주를 기록한다(경주당 한 번만 — Provider 가 확인한다).
 * - 토스트는 한 번에 하나, TOAST_MS 씩. 시뮬레이션이 메시지 간격을 같은 값으로 제한하므로 큐가 밀리지 않는다.
 */
export function useRaceRun(
  horses: Horse[],
  stage: RaceStage | null,
  scene: RefObject<TrackScene | null>,
): { frame: RaceFrame | null; message: RaceEventMessage | null } {
  const { runRef, recordResult } = useRaceSession();
  const [live, setLive] = useState<LiveState | null>(null);
  const queue = useRef<RaceEventMessage[]>([]);
  const shown = useRef<{ id: string; at: number } | null>(null);

  const kind = stage?.kind ?? null;
  const raceNo = stage?.raceNo ?? null;
  const startedAt = stage?.startedAt ?? null;

  const nameOf = useCallback(
    (horseId: number) => horses.find((h) => h.id === horseId)?.name.toUpperCase() ?? String(horseId),
    [horses],
  );

  useEffect(() => {
    if (kind === null || kind === "FINISHED" || raceNo === null || startedAt === null) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastHudAt = Number.NEGATIVE_INFINITY;
    let lastOrder = "";
    let message: RaceEventMessage | null = null;
    // 다시 보일 때(Activity) 숨겨진 동안 쌓인 메시지는 버린다
    queue.current = [];
    shown.current = null;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < -RACE_COUNTDOWN_MS) {
        // 아직 출발 전 — 카운트다운 시작 시각까지 기다린다(최대 1초 단위)
        timer = setTimeout(tick, Math.min(1000, -elapsed - RACE_COUNTDOWN_MS));
        return;
      }
      let run = runRef.current;
      // 시뮬레이션에는 그 경주 당시의 출전마(말 id 순 · 성향)를 넘긴다 — 정산(getRaceResult) · 기록 보충과 같은 순위가 나오게
      if (!run || run.raceNo !== raceNo || run.startedAt !== startedAt) run = createRace(raceHorsesAt(startedAt), raceNo, startedAt);
      const { run: next, events } = advanceTo(run, elapsed, nameOf);
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
      if (changed || done) setLive({ raceNo, frame: snapshot, message });

      if (done) {
        recordResult({ raceNo, date: new Date(startedAt).toISOString(), ranking: next.ranking });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [kind, raceNo, startedAt, horses, runRef, recordResult, nameOf, scene]);

  // 다른 경주의 상태는 쓰지 않는다. 토스트는 RUNNING 에서만
  const current = live && live.raceNo === raceNo ? live : null;
  return { frame: current?.frame ?? null, message: kind === "RUNNING" ? (current?.message ?? null) : null };
}
