// 레이스 시뮬레이션 — 순수 함수(BLUEPRINT 8.2 "레이스 시뮬레이션"). React · DOM 에 의존하지 않는다.
// useRaceRun(rAF 루프)이 advanceTo 로 "지금까지의 경과 시간"만큼 진행시킨다. 진행도는 프레임 누적이 아니라
// 출발 시각 기준 경과 시간으로 따라가므로, 페이지를 떠났다 돌아와도(rAF 가 멈춰도) 경주가 이어진다.
// 무작위는 random 인자로 주입한다(테스트 · 추후 서버 결과 재생 모드 대비).
import type { Horse, HorseTrait, RaceEventMessage, RaceEventType, RaceRun, RunnerState } from "../_types";
import { messageFor } from "./messages";

/** 튜닝 목표: 7마리 모두 들어오기까지 10~15초 */
export const BASE_FINISH_MS = 12000; // 평균 완주 시간(배율 1 기준)
const SPEED_JITTER = [0.93, 1.07] as const; // 출발 때 말마다 한 번 정하는 기본 속도 폭

/** 한 스텝의 최대 길이 — 탭이 뒤로 갔다 오면 dt 가 커지므로 이 단위로 나눠 따라잡는다 */
export const STEP_MAX_MS = 50;
/** 안전장치 — 이 시간이 지나면 남은 말은 진행도 순으로 강제 마감 */
export const RACE_MAX_MS = 18000;
/** 결승 통과 뒤에도 이만큼은 더 달려 화면 밖으로 나간다 */
const RUN_OUT_PROGRESS = 1.6;

const EVENT_INTERVAL_MS = 300;
/** 300ms 마다 말별 이벤트 확률 */
const EVENT_CHANCE: Record<HorseTrait, number> = {
  FAST_START: 0.04,
  STEADY: 0.02,
  LATE_SPURT: 0.04,
  WILDCARD: 0.09,
  BALANCED: 0.04,
};
/** 이벤트 종류 가중치(BOOST · SLOW · STUMBLE) */
const EVENT_WEIGHTS: [RaceEventType, number][] = [
  ["BOOST", 0.45],
  ["SLOW", 0.35],
  ["STUMBLE", 0.2],
];
const EVENT_EFFECT: Record<"BOOST" | "SLOW" | "STUMBLE" | "SPURT", { multiplier: number; durationMs: number }> = {
  BOOST: { multiplier: 1.35, durationMs: 1000 },
  SLOW: { multiplier: 0.7, durationMs: 800 },
  STUMBLE: { multiplier: 0.4, durationMs: 500 },
  SPURT: { multiplier: 1.3, durationMs: 1200 },
};
/** WILDCARD 는 변동폭이 크다 — 배율이 1 에서 벗어난 만큼을 이 배수로 키운다 */
const WILDCARD_SWING = 1.3;
const SPURT_FROM = 0.75; // 이 진행도부터 막판 스퍼트
const SPURT_CHANCE = 0.02; // LATE_SPURT 가 아닌 말이 스퍼트할 확률(판정마다)
const DRIFT_RANGE = [0.95, 1.05] as const;
const DRIFT_STEP = 0.03;

const MESSAGE_GAP_MS = 1500; // 화면 메시지 최소 간격(토스트 표시 시간과 같아 큐가 밀리지 않는다)
const OVERTAKE_COOLDOWN_MS = 2000;
const LEAD_BATTLE_GAP = 0.02;
const LEAD_BATTLE_HOLD_MS = 1000;
const LEAD_BATTLE_COOLDOWN_MS = 4000;

/**
 * 구간별 성향 배율 — 0~30% · 30~70% · 70~100%.
 * 평균 완주 시간이 성향마다 비슷해지도록(우승 확률이 한쪽으로 쏠리지 않게) 몬테카를로로 맞춘 값이다.
 * 추입형은 막판 스퍼트(SPURT)를 한 번 보장받으므로 구간 배율은 조금 낮다.
 */
const TRAIT_MULTIPLIER: Record<HorseTrait, [number, number, number]> = {
  FAST_START: [1.15, 1.0, 0.92],
  STEADY: [1.01, 1.02, 1.01],
  LATE_SPURT: [0.9, 1.0, 1.12],
  WILDCARD: [1.0, 1.0, 1.0],
  BALANCED: [1.02, 1.02, 1.02],
};

export type Random = () => number;

function between(random: Random, [min, max]: readonly [number, number]): number {
  return min + (max - min) * random();
}

function traitMultiplier(trait: HorseTrait, progress: number): number {
  const [early, mid, late] = TRAIT_MULTIPLIER[trait];
  return progress < 0.3 ? early : progress < 0.7 ? mid : late;
}

/** 출발 준비 — 말마다 기본 속도를 정한다. startedAt 은 경과 0(출발)이 되는 epoch ms */
export function createRace(horses: Horse[], raceNo: number, startedAt: number, random: Random = Math.random): RaceRun {
  const runners: RunnerState[] = horses.map((horse) => ({
    horseId: horse.id,
    trait: horse.trait,
    progress: 0,
    baseSpeed: (1 / BASE_FINISH_MS) * between(random, SPEED_JITTER),
    drift: 1,
    modifier: 1,
    modifierUntil: 0,
    spurted: false,
    finishedAt: null,
  }));
  return {
    raceNo,
    startedAt,
    elapsed: 0,
    runners,
    ranking: [],
    doneAt: null,
    nextEventCheck: EVENT_INTERVAL_MS,
    lastMessageAt: -Infinity,
    lastOvertakeAt: -Infinity,
    leadBattleSince: null,
    lastLeadBattleAt: -Infinity,
    prevOrder: runners.map((r) => r.horseId),
    eventSeq: 0,
  };
}

/** 현재 순위 — 들어온 말은 도착 순서, 아직 달리는 말은 진행도 순 */
export function liveOrder(runners: RunnerState[]): number[] {
  return [...runners]
    .sort((a, b) => {
      if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
      if (a.finishedAt !== null) return -1;
      if (b.finishedAt !== null) return 1;
      return b.progress - a.progress;
    })
    .map((r) => r.horseId);
}

/** 선두 진행도(카메라 · 남은 거리용). 1 을 넘지 않는다 */
export function leaderProgress(runners: RunnerState[]): number {
  return Math.min(1, Math.max(0, ...runners.map((r) => r.progress)));
}

/**
 * 한 스텝(dtMs ≤ STEP_MAX_MS) 진행. 새 run 과 이번 스텝의 화면 메시지를 돌려준다.
 * 경과 시간이 0 미만(카운트다운)이면 아무것도 움직이지 않는다.
 */
export function step(
  run: RaceRun,
  dtMs: number,
  random: Random = Math.random,
  names: (horseId: number) => string = String,
): { run: RaceRun; events: RaceEventMessage[] } {
  const now = run.elapsed + dtMs;
  // 모두 들어오고 한참 지났으면 시간만 흘려보낸다(따라잡기 루프가 헛돌지 않게)
  if (run.doneAt !== null && run.elapsed - run.doneAt > 5000) return { run: { ...run, elapsed: now }, events: [] };
  const events: RaceEventMessage[] = [];
  let { lastMessageAt, lastOvertakeAt, leadBattleSince, lastLeadBattleAt, nextEventCheck, eventSeq } = run;
  const ranking = [...run.ranking];

  const say = (type: RaceEventType, runner: RunnerState, extra?: { rank?: number; other?: string }) => {
    if (now - lastMessageAt < MESSAGE_GAP_MS) return;
    lastMessageAt = now;
    eventSeq += 1;
    events.push({
      id: `${run.raceNo}-${eventSeq}`,
      horseId: runner.horseId,
      type,
      text: messageFor(type, names(runner.horseId), extra),
      at: now,
    });
  };

  // 1. 무작위 이벤트 판정(300ms 마다) — 달리는 중인 말만
  let runners = run.runners;
  const checkEvents = now >= nextEventCheck;
  if (checkEvents) {
    nextEventCheck = now + EVENT_INTERVAL_MS;
    runners = runners.map((r) => {
      if (r.finishedAt !== null) return r;
      const swing = r.trait === "WILDCARD" ? WILDCARD_SWING : 1;
      let next: RunnerState = {
        ...r,
        drift: Math.min(DRIFT_RANGE[1], Math.max(DRIFT_RANGE[0], r.drift + (random() - 0.5) * 2 * DRIFT_STEP * swing)),
      };
      // 막판 스퍼트 — 추입형은 한 번 보장, 나머지는 낮은 확률(경주당 한 번)
      if (!next.spurted && next.progress > SPURT_FROM && (next.trait === "LATE_SPURT" || random() < SPURT_CHANCE)) {
        next = { ...next, spurted: true, modifier: EVENT_EFFECT.SPURT.multiplier, modifierUntil: now + EVENT_EFFECT.SPURT.durationMs };
        say("SPURT", next);
        return next;
      }
      if (next.modifier === 1 && random() < EVENT_CHANCE[next.trait]) {
        const pick = random();
        let acc = 0;
        let type: RaceEventType = "BOOST";
        for (const [t, w] of EVENT_WEIGHTS) {
          acc += w;
          if (pick < acc) {
            type = t;
            break;
          }
        }
        const effect = EVENT_EFFECT[type as "BOOST" | "SLOW" | "STUMBLE"];
        next = { ...next, modifier: 1 + (effect.multiplier - 1) * swing, modifierUntil: now + effect.durationMs };
        say(type, next);
      }
      return next;
    });
  }

  // 2. 이동
  const moving = now > 0;
  runners = runners.map((r) => {
    if (!moving) return r;
    if (r.finishedAt !== null) {
      // 통과한 말은 화면 밖까지만 더 달린다
      if (r.progress >= RUN_OUT_PROGRESS) return r;
      return { ...r, progress: r.progress + r.baseSpeed * dtMs };
    }
    const modifier = now >= r.modifierUntil ? 1 : r.modifier;
    const speed = r.baseSpeed * traitMultiplier(r.trait, r.progress) * r.drift * modifier;
    const progress = r.progress + speed * dtMs;
    const next: RunnerState = { ...r, progress, modifier: modifier === 1 ? 1 : r.modifier };
    if (progress >= 1) {
      next.finishedAt = now;
      ranking.push(r.horseId);
    }
    return next;
  });

  // 3. 안전장치 — 18초가 지나면 남은 말을 진행도 순으로 마감
  if (now >= RACE_MAX_MS) {
    const left = runners.filter((r) => r.finishedAt === null).sort((a, b) => b.progress - a.progress);
    left.forEach((r, i) => {
      ranking.push(r.horseId);
      runners = runners.map((x) => (x.horseId === r.horseId ? { ...x, progress: Math.max(x.progress, 1), finishedAt: now + i } : x));
    });
  }

  // 같은 스텝에 둘 이상 들어오면 도착 순서는 진행도 순(더 멀리 간 말이 먼저)
  const arrivedNow = ranking.slice(run.ranking.length);
  if (arrivedNow.length > 1) {
    const byProgress = [...arrivedNow].sort(
      (a, b) => runners.find((r) => r.horseId === b)!.progress - runners.find((r) => r.horseId === a)!.progress,
    );
    ranking.splice(run.ranking.length, arrivedNow.length, ...byProgress);
    const base = now;
    runners = runners.map((r) => (byProgress.includes(r.horseId) ? { ...r, finishedAt: base + byProgress.indexOf(r.horseId) * 0.001 } : r));
  }

  // 4. 추월 · 선두 경쟁 메시지(달리는 말이 둘 이상일 때)
  const order = liveOrder(runners);
  if (moving && run.doneAt === null) {
    for (let rank = 0; rank < Math.min(3, order.length); rank++) {
      const horseId = order[rank];
      const prevRank = run.prevOrder.indexOf(horseId);
      const runner = runners.find((r) => r.horseId === horseId)!;
      if (prevRank > rank && runner.finishedAt === null && now - lastOvertakeAt >= OVERTAKE_COOLDOWN_MS && runner.progress > 0.08) {
        lastOvertakeAt = now;
        say("OVERTAKE", runner, { rank: rank + 1 });
        break;
      }
    }
    const first = runners.find((r) => r.horseId === order[0])!;
    const second = runners.find((r) => r.horseId === order[1])!;
    if (first.finishedAt === null && second && first.progress - second.progress < LEAD_BATTLE_GAP && first.progress > 0.2) {
      leadBattleSince ??= now;
      if (now - leadBattleSince >= LEAD_BATTLE_HOLD_MS && now - lastLeadBattleAt >= LEAD_BATTLE_COOLDOWN_MS) {
        lastLeadBattleAt = now;
        say("LEAD_BATTLE", first, { other: names(second.horseId) });
      }
    } else {
      leadBattleSince = null;
    }
  }

  const doneAt = run.doneAt ?? (ranking.length === runners.length ? now : null);

  return {
    run: {
      ...run,
      elapsed: now,
      runners,
      ranking,
      doneAt,
      nextEventCheck,
      lastMessageAt,
      lastOvertakeAt,
      leadBattleSince,
      lastLeadBattleAt,
      prevOrder: order,
      eventSeq,
    },
    events,
  };
}

/** 경과 시간 targetMs 까지 STEP_MAX_MS 단위로 따라잡는다(숨겨졌던 시간 · 긴 프레임 모두 여기서 처리) */
export function advanceTo(
  run: RaceRun,
  targetMs: number,
  random: Random = Math.random,
  names?: (horseId: number) => string,
): { run: RaceRun; events: RaceEventMessage[] } {
  const events: RaceEventMessage[] = [];
  let current = run;
  while (current.elapsed < targetMs) {
    const dt = Math.min(STEP_MAX_MS, targetMs - current.elapsed);
    const result = step(current, dt, random, names);
    current = result.run;
    events.push(...result.events);
    if (current.doneAt !== null && current.elapsed - current.doneAt > 5000) break;
  }
  return { run: current, events };
}
