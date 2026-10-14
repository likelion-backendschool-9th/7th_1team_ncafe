// 오늘의 컨디션(사용자 결정 2026-10-14) — 말 · 날짜(KST)로 시드한 결정적 Mock 이라 그 날은 누가 봐도 같다.
// 표시용 값이다: 시뮬레이션(경주 결과)에는 넘기지 않는다. 서버가 붙으면 raceService.getHorseConditions 가 API 결과를 돌려주고 mockConditions 는 지운다.
import type { HorseCondition } from "../_types";

export const CONDITION_LABEL: Record<HorseCondition, string> = {
  BEST: "최상",
  GOOD: "좋음",
  NORMAL: "보통",
  LOW: "저조",
};

/** 막대 칸 수(CONDITION_MAX 칸 중 몇 칸) */
export const CONDITION_LEVEL: Record<HorseCondition, number> = { BEST: 4, GOOD: 3, NORMAL: 2, LOW: 1 };
export const CONDITION_MAX = 4;

/** 나올 확률 — 보통 · 좋음이 대부분이고 최상 · 저조는 가끔 */
const WEIGHTS: readonly [HorseCondition, number][] = [
  ["BEST", 0.15],
  ["GOOD", 0.35],
  ["NORMAL", 0.35],
  ["LOW", 0.15],
];

/** FNV-1a 32bit → murmur3 마무리 섞기 → 0 이상 1 미만 */
function unit(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function conditionOf(horseId: number, date: string): HorseCondition {
  let r = unit(`${date}|condition|${horseId}`);
  for (const [condition, weight] of WEIGHTS) {
    if (r < weight) return condition;
    r -= weight;
  }
  return "NORMAL";
}

/** 그 날(KST "YYYY-MM-DD") 말마다의 컨디션 — 말 id → 컨디션 */
export function mockConditions(horseIds: readonly number[], date: string): Record<number, HorseCondition> {
  return Object.fromEntries(horseIds.map((id) => [id, conditionOf(id, date)]));
}
