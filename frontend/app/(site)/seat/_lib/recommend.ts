// 추천 좌석 순수 함수 — 지시서 20절 · BLUEPRINT 8.3 "추천". 고른 시간대에 인원만큼 빈 의자가 있는 자리를 점수로 골라 상위 3개.
// 테이블은 빈 의자 중 번호 순으로 인원만큼, 바석은 나란히 비어 있는 스툴을 인원만큼 묶는다. 누르면 그 의자들이 바로 선택된다.
import type { ChairStatusMap, Seat } from "../_types";
import { chairId } from "./geometry";
import { featureLabels } from "./labels";
import { freeChairIds, type SeatFilterState } from "./filter";

export interface Recommendation {
  key: string; // "T03" · "B03+B04"
  seat: Seat; // 대표 자리(바석 묶음이면 첫 스툴)
  chairIds: string[]; // 누르면 선택될 의자
  label: string; // "T03" · "B03 · B04"
  reasons: string[]; // "창가 · 콘센트 · 2인 이용 가능"
  detail: string; // "빈 의자 4/4" · "바 좌석 · 나란히 2석"
  score: number;
}

export interface RecommendResult {
  picks: Recommendation[]; // 상위 3개
  fallback: Recommendation | null; // 0개일 때 특징 조건을 뺀 가장 가까운 대안 1개
}

export const RECOMMEND_LIMIT = 3;

/** 인원 대비 크기 점수 — 딱 맞음 +2 · 1~2석 여유 +1 · 3석 여유 0 · 4석 이상(2명에 8인석) −2 */
function fitScore(capacity: number, people: number): number {
  const spare = capacity - people;
  if (spare === 0) return 2;
  if (spare <= 2) return 1;
  if (spare === 3) return 0;
  return -2;
}

function hasFeatures(seat: Seat, filter: SeatFilterState): boolean {
  return filter.features.every((f) => seat.features.includes(f));
}

function tableCandidates(seats: Seat[], statuses: ChairStatusMap, filter: SeatFilterState, people: number): Recommendation[] {
  const out: Recommendation[] = [];
  for (const seat of seats) {
    if (seat.type !== "TABLE" || seat.capacity < people || !hasFeatures(seat, filter)) continue;
    const free = freeChairIds(seat, statuses);
    if (free.length < people) continue;
    let score = fitScore(seat.capacity, people);
    if (free.length === seat.capacity) score += 1; // 테이블을 통째로 쓸 수 있다
    if (seat.features.includes("QUIET")) score += 0.5;
    out.push({
      key: seat.id,
      seat,
      chairIds: free.slice(0, people),
      label: seat.id,
      reasons: [...featureLabels(seat), `${people}인 이용 가능`],
      detail: `빈 의자 ${free.length}/${seat.capacity}`,
      score,
    });
  }
  return out;
}

/** 바석 — 위에서 아래로 나란히 비어 있는 스툴 묶음(길이 ≥ 인원)마다 후보 하나 */
function barCandidates(seats: Seat[], statuses: ChairStatusMap, filter: SeatFilterState, people: number): Recommendation[] {
  const stools = seats.filter((s) => s.type === "BAR" && hasFeatures(s, filter)).sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const out: Recommendation[] = [];
  let run: Seat[] = [];
  const flush = () => {
    if (run.length >= people) {
      const picked = run.slice(0, people);
      out.push({
        key: picked.map((s) => s.id).join("+"),
        seat: picked[0],
        chairIds: picked.map((s) => chairId(s.id, 1)),
        label: picked.map((s) => s.id).join(" · "),
        reasons: [...featureLabels(picked[0]), `${people}인 이용 가능`],
        detail: people === 1 ? "바 좌석" : `바 좌석 · 나란히 ${people}석`,
        // 혼자면 바석도 딱 맞는 자리(+2), 여럿이면 테이블보다 한 단계 아래(+1)
        score: (people === 1 ? 2 : 1) + (picked[0].features.includes("QUIET") ? 0.5 : 0),
      });
    }
    run = [];
  };
  for (const stool of stools) {
    const free = freeChairIds(stool, statuses).length === 1;
    if (free) run.push(stool);
    else flush();
  }
  flush();
  return out;
}

function rank(candidates: Recommendation[]): Recommendation[] {
  return [...candidates].sort((a, b) => b.score - a.score || a.seat.capacity - b.seat.capacity || a.key.localeCompare(b.key));
}

/**
 * 추천 — 인원이 없으면 비어 있다. 특징 조건을 만족하는 자리가 하나도 없으면 특징을 뺀 대안 1개를 fallback 으로 준다.
 */
export function recommendSeats(seats: Seat[], statuses: ChairStatusMap, filter: SeatFilterState, people: number | null): RecommendResult {
  if (people === null || people < 1) return { picks: [], fallback: null };
  const picks = rank([...tableCandidates(seats, statuses, filter, people), ...barCandidates(seats, statuses, filter, people)]).slice(0, RECOMMEND_LIMIT);
  if (picks.length > 0 || filter.features.length === 0) return { picks, fallback: null };
  const relaxed: SeatFilterState = { ...filter, features: [] };
  const alternative = rank([...tableCandidates(seats, statuses, relaxed, people), ...barCandidates(seats, statuses, relaxed, people)])[0] ?? null;
  return { picks, fallback: alternative };
}
