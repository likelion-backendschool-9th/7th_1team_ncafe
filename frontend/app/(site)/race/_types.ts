// 레이스 도메인 타입 — /race 와 RaceProvider(components/)가 함께 쓴다.

// ---- Horse ----
/** 주행 성향 — 8단계 시뮬레이션의 구간별 속도 배율 · 이벤트 확률에 쓰인다 */
export type HorseTrait = "FAST_START" | "STEADY" | "LATE_SPURT" | "WILDCARD" | "BALANCED";

export interface Horse {
  id: number; // 1~7 — 말 식별자. 게이트 번호는 경주마다 지난 경주 도착 순서로 다시 매긴다(Gates, records.gatesFor)
  name: string; // "Mocha" — 화면에는 대문자로
  nameKo: string; // "모카"
  color: string; // 대표색 hex = 이미지의 번호 조끼 색 — 번호 배지 · 내 말 레인 강조
  colorName: string; // "초록"
  image: string; // "/images/horses/mocha.png" — 말에셋.png 를 잘라 만든 420×300 투명 PNG(scripts/split-horses.mjs)
  personality: string; // "느긋하다 마지막에 폭발"
  trait: HorseTrait;
  description: string; // "막판 스퍼트가 강한 말"
}
// 최근 성적은 말 데이터에 두지 않고 경주 기록(RaceResult)에서 계산한다 — _lib/records.ts

/**
 * 오늘의 컨디션(사용자 결정 2026-10-14) — 메인 "TODAY'S RUNNERS" · 출전표 카드에 보인다.
 * 말 · 날짜(KST)마다 정해지는 표시용 값이고 시뮬레이션(경주 결과)에는 쓰지 않는다 — _lib/condition.ts
 */
export type HorseCondition = "BEST" | "GOOD" | "NORMAL" | "LOW";

/** 관리자 출전마 수정 폼 값(/admin/race) — 말 id 는 바꾸지 않는다(7마리 고정) */
export type HorseInput = Omit<Horse, "id">;

/**
 * 한 경주의 게이트 표 — 말 id → 그 경주의 게이트 번호(1~7). BLUEPRINT 8.2 "게이트 번호 규칙"(팀 협의 2026-10-13):
 * 지난 경주에 들어온 순서대로 1번부터. 화면 표시 전용이다 — 시뮬레이션에 넘기는 말 순서(말 id 순)와는 상관없다.
 */
export type Gates = Readonly<Record<number, number>>;

// ---- Race ----
export interface RaceResult {
  raceNo: number;
  date: string; // ISO — 출발 시각(RACE_TIMES 의 한 칸). 시드의 재료이기도 하다
  ranking: number[]; // horseId 를 1위~7위 순서로
}

/** 내가 건 경주 — 쿠폰 1장(RACE_ENTRY_COUPONS)을 이미 낸 상태 */
export interface RaceBet {
  raceNo: number;
  startsAt: string; // ISO — 그 경주의 출발 시각. 결과를 받을 때(시드) 쓴다
  horseId: number;
  placedAt: string; // ISO
}

/**
 * 트랙 무대의 상태 — 사용자의 버튼이 아니라 시계(경주 시각)로 정해진다(사용자 결정 2026-10-13: 경주 시각에 모두 동시에 출발 · 종료).
 * WAIT: 출발 전(쿠폰을 걸었으면 READY, 아니면 관람 대기 · gateClosed 면 마감) · RUNNING: 경주 중 · FINISHED: 방금 끝난 경주(LIVE 창 동안)
 */
export type RaceStageKind = "WAIT" | "RUNNING" | "FINISHED";

export interface RaceStage {
  kind: RaceStageKind;
  raceNo: number;
  startedAt: number; // 출발 시각(epoch ms) — 시뮬레이션 시드 · 경과 시간의 기준
  bet: RaceBet | null; // 이 경주에 내가 건 말(없으면 관람)
  result: RaceResult | null; // FINISHED 일 때 그 경주의 결과
  gateClosed: boolean; // 출발 RACE_GATE_CLOSE_MS 전부터 true — 더는 걸 수 없다
}

export type RaceEventType = "BOOST" | "SLOW" | "SPURT" | "OVERTAKE" | "STUMBLE" | "LEAD_BATTLE";

export interface RaceEventMessage {
  id: string;
  horseId: number;
  type: RaceEventType;
  text: string; // "🔥 MOCHA가 속도를 올립니다!"
  at: number; // 경주 경과 ms — 너무 오래된 메시지는 보여 주지 않는다
}

// ---- Simulation (8단계) — _lib/simulation.ts 의 순수 함수가 다루는 상태. UI 의존 없음 ----
export interface RunnerState {
  horseId: number;
  trait: HorseTrait;
  progress: number; // 0 ~ 1 (1 = 결승). 통과한 뒤에도 화면 밖으로 달려 나가도록 조금 더 늘어난다
  prevProgress: number; // 직전 스텝의 진행도 — 스텝 사이를 그릴 때 보간
  baseSpeed: number; // 진행도/ms — 출발 때 시드 난수로 정한다
  drift: number; // 완만한 속도 흔들림 배율(0.95 ~ 1.05) — 엎치락뒤치락의 바탕
  modifier: number; // 이벤트로 생긴 일시 속도 배율(1 = 정상)
  modifierUntil: number; // 경주 경과 ms — 지나면 modifier 가 1 로 돌아온다
  spurted: boolean; // 막판 스퍼트는 경주당 한 번
  finishedAt: number | null; // 결승 통과 시점(경과 ms)
}

export interface RaceRun {
  raceNo: number;
  startedAt: number; // epoch ms — 경과 0(출발) 이 되는 순간. 카운트다운 동안은 경과가 음수
  rng: number; // 시드 난수 상태(mulberry32) — raceNo · startedAt 에서 만들어 모든 사용자가 같은 경주를 본다
  elapsed: number; // 시뮬레이션이 반영한 경과 ms(STEP_MS 의 배수)
  runners: RunnerState[]; // 받은 말 배열 순서(말 id 순) — 난수를 이 순서로 쓰므로 바꾸면 순위가 달라진다. 게이트 번호와 무관
  ranking: number[]; // 도착 순서(horseId) — 7마리 모두 들어오면 완성
  doneAt: number | null; // 마지막 말이 들어온 경과 ms
  // 이벤트 · 메시지 상태
  nextEventCheck: number; // 다음 무작위 이벤트 판정 시점(경과 ms)
  lastMessageAt: number; // 화면 메시지 스로틀
  lastOvertakeAt: number;
  leadBattleSince: number | null;
  lastLeadBattleAt: number;
  prevOrder: number[]; // 지난 스텝의 순위(추월 감지)
  eventSeq: number; // 메시지 id 용 일련번호
}
