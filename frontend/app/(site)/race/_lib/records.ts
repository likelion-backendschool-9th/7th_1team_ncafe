// 경주 기록 · 표시용 순수 함수.
import type { Gates, Horse, HorseTrait, RaceResult, ServerRace } from "../_types";
import { seededShuffle } from "./simulation";

/** 정산된 서버 경주 → 경주 결과(1~7위 말 id). 정산 전이면 null */
export function raceResult(race: ServerRace): RaceResult | null {
  if (race.status !== "SETTLED" || race.runners.length === 0 || race.runners.some((r) => r.rank === null)) return null;
  const ranking = [...race.runners].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((r) => r.horse.id);
  return { raceNo: race.raceNo, date: new Date(race.startsAt).toISOString(), ranking };
}

/**
 * 서버 경주의 게이트 표(BLUEPRINT 8.2 "게이트 번호 규칙" — 서버가 앞 경주 도착 순서로 매긴다). 그 경주 당시 번호라 끝난 뒤에도 같다.
 * 경주가 없거나 아직 번호가 없으면(앞 경주가 정산되기 전) 말 id 순으로 1번부터 둔다.
 */
export function raceGates(race: ServerRace | null, horses: Horse[]): Gates {
  if (race && race.runners.length > 0 && race.runners.every((r) => r.gate !== null)) {
    return Object.fromEntries(race.runners.map((r) => [r.horse.id, r.gate as number]));
  }
  return Object.fromEntries([...horses].sort((a, b) => a.id - b.id).map((h, i) => [h.id, i + 1]));
}

/** 여러 출처의 기록을 번호로 합친다(앞쪽 출처 우선) — 최신순 */
export function mergeHistory(...sources: RaceResult[][]): RaceResult[] {
  const seen = new Set<number>();
  const merged: RaceResult[] = [];
  for (const source of sources) {
    for (const r of source) {
      if (seen.has(r.raceNo)) continue;
      seen.add(r.raceNo);
      merged.push(r);
    }
  }
  return merged.sort((a, b) => b.raceNo - a.raceNo);
}

/**
 * 도착 순서(말 id, 1위부터) → 그다음 경주의 게이트 표. 도착 순서가 없으면 seed 로 섞은 순서.
 * /race/lab(직전 실험 경주)이 쓴다 — 실제 경주의 게이트 번호는 서버가 같은 규칙으로 매긴다(raceGates).
 */
export function gatesAfter(ranking: number[] | null, horses: Horse[], seed: number): Gates {
  const ids = horses.map((h) => h.id);
  const order = ranking ? ranking.filter((id) => ids.includes(id)) : seededShuffle(ids, seed);
  for (const id of ids) if (!order.includes(id)) order.push(id);
  return Object.fromEntries(order.map((id, i) => [id, i + 1]));
}

/** 게이트 번호 순(1번부터)으로 정렬한 새 배열 — 출전표 카드 · 트랙 줄. 시뮬레이션에는 넘기지 않는다(말 id 순 그대로) */
export function byGate(horses: Horse[], gates: Gates): Horse[] {
  return [...horses].sort((a, b) => gates[a.id] - gates[b.id]);
}

/** 순위 → 경마 용어(1 · 2 · 3착) */
export function rankLabel(rank: number): string {
  return rank === 1 ? "WIN!" : rank === 2 ? "PLACE!" : rank === 3 ? "SHOW!" : "NEXT TIME!";
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
