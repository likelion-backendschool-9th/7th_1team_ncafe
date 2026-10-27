// 오늘의 컨디션(사용자 결정 2026-10-14) — 서버가 경주를 만들 때 말 · 날짜(KST)로 정해 race_horses.condition 에 남긴다(같은 날이면 같은 값).
// 표시용 값이다: 시뮬레이션(경주 결과)에는 넘기지 않는다. 화면은 다음 경주 출전마의 condition 을 그린다.
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
