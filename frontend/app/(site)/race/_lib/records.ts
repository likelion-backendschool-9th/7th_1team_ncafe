// 경주 기록 · 표시용 순수 함수.
import type { HorseTrait, RaceResult } from "../_types";

/** 다음 경주 번호 — 기록의 가장 큰 번호 + 1 (기록이 없으면 1) */
export function nextRaceNo(history: RaceResult[]): number {
  return history.reduce((max, r) => Math.max(max, r.raceNo), 0) + 1;
}

/** 최근 n 경기의 순위(최근 경기부터). 그 말이 없는 경기는 건너뛴다 */
export function recentRanks(history: RaceResult[], horseId: number, n = 3): number[] {
  return [...history]
    .sort((a, b) => b.raceNo - a.raceNo)
    .map((r) => r.ranking.indexOf(horseId) + 1)
    .filter((rank) => rank > 0)
    .slice(0, n);
}

export const TRAIT_LABEL: Record<HorseTrait, string> = {
  FAST_START: "선행형",
  STEADY: "안정형",
  LATE_SPURT: "추입형",
  WILDCARD: "변수형",
  BALANCED: "균형형",
};

/** 대표색 배경 위 번호 글자색 — 흰 글자와 3:1 이상(큰 굵은 글자 기준)이면 흰색, 아니면 짙은 색 */
export function textOn(hex: string): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  return 1.05 / (luminance + 0.05) >= 3 ? "#ffffff" : "#141416";
}
