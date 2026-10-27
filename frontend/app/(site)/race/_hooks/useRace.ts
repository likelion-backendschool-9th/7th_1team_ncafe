"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRaceSession } from "@/components/RaceProvider";
import { ApiError } from "@/lib/api";
import { raceScheduleStore } from "@/lib/raceSchedule";
import { getRaceSchedule, RACE_GATE_CLOSE_MS } from "@/lib/time";
import { useNow } from "@/lib/useCountdown";
import { useRaceSchedule } from "@/lib/useRaceSchedule";
import type { RaceEntry } from "@/types/common";
import { RACE_ENTRY_COUPONS } from "../_lib/payout";
import { placeBet as requestBet } from "../_lib/raceService";
import { myBetsStore } from "../_lib/raceStores";
import { raceGates } from "../_lib/records";
import { advanceTo, createRace, FINISH_HOLD_MS, liveOrder, RACE_SETTLE_MS, STEP_MS } from "../_lib/simulation";
import type { SceneFrame, TrackScene } from "../_lib/trackScene";
import type { Gates, Horse, HorseCondition, RaceEventMessage, RaceResult, RaceRun, RaceStage, ServerRace, StageRun } from "../_types";
import { useMyBets, useRaceHistory, useRaceHorses } from "./useRaceData";

/** 걸기 결과 — 실패하면 확인창에 보여 줄 문구(같은 틱의 두 번째 클릭은 문구 없이 무시) */
export type BetOutcome = { ok: true } | { ok: false; message: string };
/** 걸 수 없는 이유 — 출전표 위 안내문 · 버튼 비활성. NO_RACE: 예정된 경주 없음 · LOGIN: 로그인하지 않음 */
export type BetLock = "GATE_CLOSED" | "NO_RACE" | "LOGIN" | "NO_COUPON" | null;

/** 출발 전 이만큼은 3 · 2 · 1 카운트다운 */
export const RACE_COUNTDOWN_MS = 3000;
/** 이벤트 토스트 하나를 보여 주는 시간 · 이보다 오래된 메시지는 버린다 */
const TOAST_MS = 1500;
const TOAST_STALE_MS = 3000;
/** React(HUD · 카운트다운) 갱신 간격 — 캔버스는 매 프레임, DOM 은 이 간격(또는 순위가 바뀔 때) */
const HUD_INTERVAL_MS = 100;

/** 서버 경주 → 경기 화면 입력(공개된 시드 · 그 경주에서 쓴 성향, 말 id 순). 시드가 아직 공개되지 않았으면 null */
function stageRunOf(race: ServerRace | null): StageRun | null {
  if (!race || race.seed === null) return null;
  return { seed: race.seed, horses: race.runners.map((r) => ({ id: r.horse.id, trait: r.trait })) };
}

/**
 * /race 진행 — 단계는 사용자의 버튼이 아니라 **경주 시각과 시계**로 정해진다(사용자 결정 2026-10-13: 모두 동시에 출발 · 종료).
 * - 경주 · 출전마 · 기록 · 내 걸기는 서버 값이다(lib/raceSchedule · _lib/raceStores). 경주 번호 · 게이트 번호 · 컨디션도 서버가 정한다.
 * - 무대(stage): LIVE 창(출발 뒤 10분)이고 그 경주 결과가 아직 없으면 RUNNING, 있으면 FINISHED. 그 밖에는 다음 경주를 기다리는 WAIT
 *   (쿠폰을 걸었거나 SOON 이면 무대를 보여 준다). 출발 RACE_GATE_CLOSE_MS 전부터 · 앞 경주가 달리는 동안은 마감이라 관람만 한다.
 *   예정된 경주가 없으면 WAIT 무대도 없고 걸 수도 없다(NO_RACE).
 * - 경기 화면은 서버가 마감 때 공개한 시드 · 성향 사본으로 그린다(정산도 같은 값으로 계산해 순위가 같다). 시드를 아직 못 받았으면 일정을 다시 불러온다.
 * - 걸기 · 쿠폰 차감 · 정산은 서버가 한다. 여기는 걸기 요청 뒤 내 걸기 · 쿠폰 수를 다시 불러오고, 정산된 내 경주의 결과 모달을 한 번 띄운다.
 */
export function useRace() {
  const now = useNow();
  const schedule = useRaceSchedule();
  const horsesState = useRaceHorses();
  const { session, history, races: settledRaces } = useRaceHistory();
  const myBets = useMyBets().data;
  const { member, loading: authLoading, refresh: refreshMember } = useAuth();
  const placing = useRef(false);
  const horses = horsesState.data;
  const races = schedule.data;

  const slots = now === null ? null : getRaceSchedule(now);
  const nextAt = slots?.next?.at ?? null;
  const liveAt = slots?.live?.at ?? null;
  const nextRace = nextAt === null ? null : (races.find((r) => r.startsAt === nextAt) ?? null);
  const liveRace = liveAt === null ? null : (races.find((r) => r.startsAt === liveAt) ?? null);
  const betOf = (no: number): RaceEntry | null => myBets.find((b) => b.raceNo === no) ?? null;
  const resultOf = (no: number): RaceResult | null => history.find((r) => r.raceNo === no) ?? null;
  const nextRun = useMemo(() => stageRunOf(nextRace), [nextRace]);
  const liveRun = useMemo(() => stageRunOf(liveRace), [liveRace]);

  let stage: RaceStage | null = null;
  if (now !== null && slots) {
    if (liveRace) {
      const result = resultOf(liveRace.raceNo);
      stage = {
        kind: result ? "FINISHED" : "RUNNING",
        raceNo: liveRace.raceNo,
        startedAt: liveRace.startsAt,
        bet: betOf(liveRace.raceNo),
        result,
        gateClosed: true,
        run: liveRun,
      };
    } else if (nextRace) {
      const bet = betOf(nextRace.raceNo);
      const gateClosed = now >= nextRace.startsAt - RACE_GATE_CLOSE_MS;
      if (bet || slots.phase === "SOON") {
        stage = { kind: "WAIT", raceNo: nextRace.raceNo, startedAt: nextRace.startsAt, bet, result: null, gateClosed, run: nextRun };
      }
    }
  }

  // 마감이 지나 시드가 공개됐는데 아직 받지 못했으면 일정을 다시 불러온다(시계가 1초마다 이 효과를 다시 돌린다)
  const needSeed =
    stage !== null && stage.kind !== "FINISHED" && stage.run === null && now !== null && now >= stage.startedAt - RACE_GATE_CLOSE_MS;
  useEffect(() => {
    if (needSeed) void raceScheduleStore.refresh();
  }, [needSeed, now]);

  // 게이트 번호(BLUEPRINT 8.2 "게이트 번호 규칙") — 서버가 앞 경주 도착 순서로 매긴 번호. 출전표는 다음 경주, 트랙 무대는 그 무대의 경주.
  // 결과 · 지난 경주 기록은 gatesOf 로 "그 경주 당시 번호"를 그린다(사용자 결정 2026-10-13)
  const raceNo = nextRace?.raceNo ?? null;
  const stageRace = stage === null ? null : stage.raceNo === liveRace?.raceNo ? liveRace : nextRace;
  const gates = useMemo(() => raceGates(nextRace, horses), [nextRace, horses]);
  const stageGates = useMemo(() => raceGates(stageRace, horses), [stageRace, horses]);
  const gatesOf = (no: number): Gates =>
    raceGates(races.find((r) => r.raceNo === no) ?? settledRaces.find((r) => r.raceNo === no) ?? null, horses);
  /** 다음 경주 출전마의 오늘 컨디션(서버가 경주를 만들 때 정한 값) */
  const conditionOf = (horseId: number): HorseCondition | null =>
    nextRace?.runners.find((r) => r.horse.id === horseId)?.condition ?? null;

  const coupons = member?.couponCount ?? 0;
  const myBet = raceNo === null ? null : betOf(raceNo);
  // 걸 수 없는 때: 이미 걸었음 · 마감(출발 10초 전부터) · 앞 경주가 달리는 중(결과 확정 전 — 서버 규칙과 같다) · 예정된 경주 없음 ·
  // 로그인하지 않음 · 쿠폰 부족
  const running = liveRace !== null && now !== null && now < liveRace.startsAt + RACE_SETTLE_MS;
  const gateClosed = running || (nextRace !== null && now !== null && now >= nextRace.startsAt - RACE_GATE_CLOSE_MS);
  const noRace = schedule.loaded && slots !== null && nextRace === null;
  const loggedOut = !authLoading && member === null;
  const lock: BetLock = gateClosed
    ? "GATE_CLOSED"
    : noRace
      ? "NO_RACE"
      : loggedOut
        ? "LOGIN"
        : member !== null && coupons < RACE_ENTRY_COUPONS
          ? "NO_COUPON"
          : null;
  const canBet = myBet === null && lock === null && nextRace !== null && member !== null;

  /** 확인창의 [사용하기] — 서버에 걸기 요청(쿠폰 1장 차감은 서버) → 내 걸기 · 쿠폰 수를 다시 불러온다 */
  async function confirmBet(horse: Horse): Promise<BetOutcome> {
    if (placing.current) return { ok: false, message: "" };
    if (!nextRace || myBet || gateClosed) return { ok: false, message: "이 경주는 마감됐어요. 다음 경주에 걸어 주세요." };
    if (!member) return { ok: false, message: "로그인하면 쿠폰을 걸 수 있어요." };
    if (coupons < RACE_ENTRY_COUPONS) return { ok: false, message: "쿠폰이 부족해요." };
    placing.current = true;
    try {
      await requestBet(nextRace.raceNo, horse.id);
      await Promise.all([myBetsStore.refresh(), refreshMember()]);
      return { ok: true };
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return { ok: false, message: "로그인이 풀렸어요. 다시 로그인해 주세요." };
      return { ok: false, message: e instanceof ApiError ? e.message : "걸지 못했어요. 잠시 후 다시 시도해 주세요." };
    } finally {
      placing.current = false;
    }
  }

  /** 가장 최근에 끝난 경주(결과 섹션) */
  const lastResult = history[0] ?? null;
  const betFor = (result: RaceResult): RaceEntry | null => betOf(result.raceNo);

  // 결과 모달 — 정산된 내 경주 중 아직 띄우지 않은 가장 최근 것. 경주당 한 번, 다른 페이지에 있었다면 /race 로 돌아왔을 때.
  // 이 페이지를 연 뒤(performance.timeOrigin) 정산된 경주만 — 그 전에 정산된 경주(도중에 로그인한 회원의 지난 경주 포함)는 띄우지 않는다
  const latestSettled = myBets.find((b) => b.settledAt !== null) ?? null;
  const fresh = latestSettled?.settledAt != null && Date.parse(latestSettled.settledAt) >= performance.timeOrigin;
  const announcement =
    latestSettled && fresh && latestSettled.raceNo > session.resultSeenUpTo
      ? { entry: latestSettled, result: resultOf(latestSettled.raceNo) }
      : null;
  const dismissAnnouncement = () => {
    if (latestSettled) session.markResultSeen(latestSettled.raceNo);
  };

  return {
    horses,
    loaded: schedule.loaded && horsesState.loaded,
    error: schedule.error ?? horsesState.error,
    stage,
    history,
    raceNo,
    gates,
    stageGates,
    gatesOf,
    conditionOf,
    member,
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
 *   시뮬레이션은 서버가 공개한 시드 · 성향 사본(stage.run)과 고정 간격이라 어느 기기든 같은 경주이고(정산 순위와도 같다), 다른 페이지에
 *   갔다 오거나(Activity 가 effect 를 정리한다) 늦게 들어와도 그 시각의 상태로 이어진다. 상태는 RaceProvider 의 runRef 에 두고 경주가 바뀌면 새로 만든다.
 *   시드를 아직 받지 못했으면(stage.run null) 출발선 장면에 머물다가, 받는 순간 지금 시각까지 따라잡는다.
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
  const stageRun = stage?.run ?? null;

  const nameOf = useCallback(
    (horseId: number) => horses.find((h) => h.id === horseId)?.name.toUpperCase() ?? String(horseId),
    [horses],
  );

  useEffect(() => {
    if (kind === null || kind === "FINISHED" || raceNo === null || startedAt === null || stageRun === null) return;
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
      // 시뮬레이션에는 서버가 정한 그 경주의 시드 · 성향 사본(말 id 순)을 넘긴다 — 서버 정산(Route Handler)과 같은 순위가 나오게
      if (!run || run.raceNo !== raceNo || run.startedAt !== startedAt) run = createRace(stageRun.horses, raceNo, startedAt, stageRun.seed);
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
  }, [kind, raceNo, startedAt, stageRun, horses, runRef, recordResult, nameOf, scene]);

  // 다른 경주의 상태는 쓰지 않는다. 토스트는 RUNNING 에서만
  const current = live && live.raceNo === raceNo ? live : null;
  return { frame: current?.frame ?? null, message: kind === "RUNNING" ? (current?.message ?? null) : null };
}
