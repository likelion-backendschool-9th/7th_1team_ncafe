// 경주 기록 · 표시용 순수 함수.
import { getRaceStartsBetween } from "@/lib/time";
import type { Gates, Horse, HorseTrait, RaceResult } from "../_types";
import { RACE_SETTLE_MS, seededShuffle, seedFor, simulateRace } from "./simulation";

/** 다음 경주 번호 — 기록의 가장 큰 번호 + 1 (기록이 없으면 1) */
export function nextRaceNo(history: RaceResult[]): number {
  return history.reduce((max, r) => Math.max(max, r.raceNo), 0) + 1;
}

/** 지나간 경주를 한 번에 몇 개까지 돌릴지 — 그보다 오래된 경주는 번호만 건너뛴다(최근 성적 · 다음 번호에는 영향 없음) */
const BACKFILL_LIMIT = 40;

/** 기록에서 가장 늦은 출발 시각(epoch ms, 없으면 0) */
export function latestRaceAt(history: RaceResult[]): number {
  return history.reduce((max, r) => Math.max(max, Date.parse(r.date)), 0);
}

/** now 기준으로 확실히 끝난(RACE_SETTLE_MS 지난) 마지막 출발 시각 — 보충 계산의 기준값. 없으면 afterMs */
export function settledRaceUntil(afterMs: number, now: number): number {
  const starts = getRaceStartsBetween(afterMs, now - RACE_SETTLE_MS);
  return starts.length ? starts[starts.length - 1] : afterMs;
}

/**
 * 지나간 경주 기록 보충(사용자 결정 2026-10-13 "자동 기록") — Mock 기록의 마지막 경주 뒤부터 untilMs(포함)까지의
 * 출발 시각마다 결정적 시뮬레이션을 돌려 결과를 만든다. 누가 언제 들어와도 경주 번호 · 출전표 최근 성적이 같아진다.
 * untilMs 는 settledRaceUntil 로 구한다(새 경주가 끝날 때만 바뀌어 메모가 유지된다). 백엔드가 붙으면 서버 기록이 이 역할을 맡는다. 결과는 최신순.
 */
export function backfillHistory(base: RaceResult[], horses: Horse[], untilMs: number): RaceResult[] {
  const lastAt = latestRaceAt(base);
  const starts = getRaceStartsBetween(lastAt, untilMs);
  const baseNo = base.reduce((max, r) => Math.max(max, r.raceNo), 0);
  const skip = Math.max(0, starts.length - BACKFILL_LIMIT);
  const filled: RaceResult[] = [];
  starts.forEach((at, i) => {
    if (i < skip) return;
    const raceNo = baseNo + i + 1;
    filled.unshift({ raceNo, date: new Date(at).toISOString(), ranking: simulateRace(horses, raceNo, at).ranking });
  });
  return filled;
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
 * 경주 raceNo 의 게이트 번호(BLUEPRINT 8.2 "게이트 번호 규칙", 팀 협의 2026-10-13) — 지난 경주(raceNo − 1)에 들어온 순서대로 1번부터.
 * 지난 경주 기록이 없으면 경주 번호로 시드한 무작위 순서(사용자 결정 2026-10-13 — 모두에게 같고, 렌더 · 페이지 이동에도 바뀌지 않으며,
 * 렌더 중 Math.random 이 없어 정적 셸과 하이드레이션이 맞는다). 지난 경주에 없던 말은 그 뒤에 id 순으로 붙인다.
 * 한 경주의 번호는 지난 경주 결과로만 정해지므로 그 경주가 끝난 뒤에도 같다(결과 · 지난 경주 기록에 "그 경주 당시 번호"를 그린다).
 */
export function gatesFor(raceNo: number, history: RaceResult[], horses: Horse[]): Gates {
  const prev = history.find((r) => r.raceNo === raceNo - 1);
  return gatesAfter(prev?.ranking ?? null, horses, seedFor(raceNo, 0));
}

/**
 * 도착 순서(말 id, 1위부터) → 그다음 경주의 게이트 표. 도착 순서가 없으면 seed 로 섞은 순서.
 * gatesFor(실제 경주) · /race/lab(직전 실험 경주)이 함께 쓴다.
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
