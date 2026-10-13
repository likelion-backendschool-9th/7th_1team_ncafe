// 레이스 시뮬레이션 — 순수 함수(BLUEPRINT 8.2 "레이스 시뮬레이션"). React · DOM 에 의존하지 않는다.
// 결정적(deterministic)이다(사용자 결정 2026-10-13 — 경주 시각에 모두 동시에 출발 · 종료, 같은 순위):
//   · 난수는 경주 번호 + 출발 시각으로 시드한 mulberry32 이고 상태(rng)를 run 안에 들고 다닌다
//   · 시간은 STEP_MS 고정 간격으로만 진행한다(프레임 길이와 무관) — 같은 입력이면 어느 기기에서든 같은 결과
// useRaceRun(rAF 루프)이 advanceTo 로 "지금까지의 경과 시간"만큼 진행시키고, 지나간 경주는 simulateRace 로 한 번에 돌려 기록한다.
// 백엔드가 붙으면 서버가 내려준 결과를 재생하는 모드로 바꾼다(시드 대신 ranking · 이벤트 타임라인).
import type { Horse, HorseTrait, RaceEventMessage, RaceEventType, RaceRun, RunnerState } from "../_types";
import { messageFor } from "./messages";

/** 튜닝 목표: 7마리 모두 들어오기까지 10~15초 */
export const BASE_FINISH_MS = 12000; // 평균 완주 시간(배율 1 기준)
const SPEED_JITTER = [0.93, 1.07] as const; // 출발 때 말마다 한 번 정하는 기본 속도 폭

/** 고정 시간 간격 — 모든 기기가 같은 스텝을 밟는다. 그리기는 스텝 사이를 보간한다 */
export const STEP_MS = 20;
/** 안전장치 — 이 시간이 지나면 남은 말은 진행도 순으로 강제 마감 */
export const RACE_MAX_MS = 18000;
/** 마지막 말이 들어온 뒤 이만큼 더 보여 주고 결과로 넘어간다 */
export const FINISH_HOLD_MS = 1500;
/** 출발 뒤 이만큼 지나면 어느 기기에서든 끝나 있다 — 지나간 경주 기록 보충의 기준 */
export const RACE_SETTLE_MS = RACE_MAX_MS + FINISH_HOLD_MS;
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

// ---------- 시드 난수(mulberry32) — 상태를 숫자 하나로 들고 다닌다 ----------

interface Rng {
  next: () => number; // [0, 1)
  state: () => number;
}

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next: () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => a,
  };
}

/** 경주 번호 + 출발 시각(분 단위) → 32비트 시드 */
export function seedFor(raceNo: number, startedAt: number): number {
  let h = 0x811c9dc5 ^ raceNo;
  h = Math.imul(h, 0x01000193);
  h ^= Math.floor(startedAt / 60000);
  h = Math.imul(h, 0x01000193);
  h ^= h >>> 13;
  return h >>> 0;
}

/** 시드로 섞은 새 배열(Fisher–Yates) — 같은 시드면 어느 기기에서든 같은 순서. 기록이 없는 경주의 게이트 순서(records.gatesFor)에 쓴다 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function between(rng: Rng, [min, max]: readonly [number, number]): number {
  return min + (max - min) * rng.next();
}

function traitMultiplier(trait: HorseTrait, progress: number): number {
  const [early, mid, late] = TRAIT_MULTIPLIER[trait];
  return progress < 0.3 ? early : progress < 0.7 ? mid : late;
}

/** 출발 준비 — 말마다 기본 속도를 시드 난수로 정한다. startedAt 은 경과 0(출발)이 되는 epoch ms */
export function createRace(horses: Horse[], raceNo: number, startedAt: number): RaceRun {
  const rng = mulberry32(seedFor(raceNo, startedAt));
  const runners: RunnerState[] = horses.map((horse) => ({
    horseId: horse.id,
    trait: horse.trait,
    progress: 0,
    prevProgress: 0,
    baseSpeed: (1 / BASE_FINISH_MS) * between(rng, SPEED_JITTER),
    drift: 1,
    modifier: 1,
    modifierUntil: 0,
    spurted: false,
    finishedAt: null,
  }));
  return {
    raceNo,
    startedAt,
    rng: rng.state(),
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
 * 한 스텝(STEP_MS) 진행. 새 run 과 이번 스텝의 화면 메시지를 돌려준다.
 * 경과 시간이 0 이하(카운트다운)면 아무것도 움직이지 않는다. 난수는 run.rng 에서 이어 쓴다.
 */
export function step(run: RaceRun, names: (horseId: number) => string = String): { run: RaceRun; events: RaceEventMessage[] } {
  const now = run.elapsed + STEP_MS;
  // 모두 들어오고 한참 지났으면 시간만 흘려보낸다(따라잡기 루프가 헛돌지 않게)
  if (run.doneAt !== null && run.elapsed - run.doneAt > 5000) return { run: { ...run, elapsed: now }, events: [] };

  const rng = mulberry32(run.rng);
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
  if (now >= nextEventCheck) {
    nextEventCheck = now + EVENT_INTERVAL_MS;
    runners = runners.map((r) => {
      if (r.finishedAt !== null) return r;
      const swing = r.trait === "WILDCARD" ? WILDCARD_SWING : 1;
      let next: RunnerState = {
        ...r,
        drift: Math.min(DRIFT_RANGE[1], Math.max(DRIFT_RANGE[0], r.drift + (rng.next() - 0.5) * 2 * DRIFT_STEP * swing)),
      };
      // 막판 스퍼트 — 추입형은 한 번 보장, 나머지는 낮은 확률(경주당 한 번)
      if (!next.spurted && next.progress > SPURT_FROM && (next.trait === "LATE_SPURT" || rng.next() < SPURT_CHANCE)) {
        next = { ...next, spurted: true, modifier: EVENT_EFFECT.SPURT.multiplier, modifierUntil: now + EVENT_EFFECT.SPURT.durationMs };
        say("SPURT", next);
        return next;
      }
      if (next.modifier === 1 && rng.next() < EVENT_CHANCE[next.trait]) {
        const pick = rng.next();
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
      if (r.progress >= RUN_OUT_PROGRESS) return { ...r, prevProgress: r.progress };
      return { ...r, prevProgress: r.progress, progress: r.progress + r.baseSpeed * STEP_MS };
    }
    const modifier = now >= r.modifierUntil ? 1 : r.modifier;
    const speed = r.baseSpeed * traitMultiplier(r.trait, r.progress) * r.drift * modifier;
    const progress = r.progress + speed * STEP_MS;
    const next: RunnerState = { ...r, prevProgress: r.progress, progress, modifier: modifier === 1 ? 1 : r.modifier };
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
    runners = runners.map((r) => (byProgress.includes(r.horseId) ? { ...r, finishedAt: now + byProgress.indexOf(r.horseId) * 0.001 } : r));
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
      rng: rng.state(),
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

/**
 * 경과 시간 targetMs 까지 STEP_MS 단위로 따라잡는다(숨겨졌던 시간 · 긴 프레임 · 늦게 들어온 사람 모두 여기서 처리).
 * 스텝을 넘지 않는 나머지(0 ≤ targetMs − run.elapsed < STEP_MS)는 그리기 쪽이 보간한다.
 */
export function advanceTo(run: RaceRun, targetMs: number, names?: (horseId: number) => string): { run: RaceRun; events: RaceEventMessage[] } {
  const events: RaceEventMessage[] = [];
  let current = run;
  while (current.elapsed + STEP_MS <= targetMs) {
    const result = step(current, names);
    current = result.run;
    events.push(...result.events);
    if (current.doneAt !== null && current.elapsed - current.doneAt > 5000) break;
  }
  return { run: current, events };
}

/** 경주 하나를 끝까지 돌려 도착 순서를 돌려준다 — 지나간 경주 기록 보충 · 테스트용. 라이브로 본 결과와 같다 */
export function simulateRace(horses: Horse[], raceNo: number, startedAt: number): { ranking: number[]; doneAt: number } {
  let run = createRace(horses, raceNo, startedAt);
  while (run.doneAt === null) run = step(run).run;
  return { ranking: run.ranking, doneAt: run.doneAt };
}
