// 좌석 필터 순수 함수 — 지시서 19절 · BLUEPRINT 8.3 "필터". 의자 단위 예약 위에서 자리(테이블 · 바석) 단위로 판정한다.
// 인원은 필터에 따로 두지 않고 일정에서 고른 값을 그대로 쓴다(사용자 결정 2026-10-13).
import type { ChairStatusMap, Seat, SeatFeature } from "../_types";
import { chairId } from "./geometry";

/** 필터에 보이는 특징 — 지시서 19절의 네 가지 */
export const FILTER_FEATURES: SeatFeature[] = ["OUTLET", "WINDOW", "QUIET", "GROUP"];

export interface SeatFilterState {
  onlyAvailable: boolean; // [전체] / [이용 가능만]
  features: SeatFeature[]; // 고른 특징을 모두 가진 자리만(AND)
}

export const EMPTY_FILTER: SeatFilterState = { onlyAvailable: false, features: [] };

/** 조건을 하나라도 골랐는가 — 아니면 배치도를 흐리게 하지 않는다 */
export function isFilterActive(filter: SeatFilterState): boolean {
  return filter.onlyAvailable || filter.features.length > 0;
}

/** 그 자리에서 비어 있는 의자 id(번호 순). 상태를 모르면 전부 비어 있다고 본다 */
export function freeChairIds(seat: Seat, statuses: ChairStatusMap | null): string[] {
  const ids: string[] = [];
  for (let no = 1; no <= seat.capacity; no++) {
    const id = chairId(seat.id, no);
    if ((statuses?.[id] ?? "AVAILABLE") === "AVAILABLE") ids.push(id);
  }
  return ids;
}

/** 인원이 앉을 수 있는 크기인가 — 1~2명은 바석(1인)도 나란히 앉을 수 있으니 통과(BLUEPRINT: 너무 큰 자리는 추천 점수에서 다룬다) */
export function fitsPeople(seat: Seat, people: number | null): boolean {
  if (people === null) return true;
  return people <= 2 ? seat.capacity >= 1 : seat.capacity >= people;
}

/**
 * 자리가 필터에 맞는가 — 맞지 않는 자리의 의자는 배치도에서 반투명이 된다(숨기지 않는다).
 * - features: 고른 특징을 모두 포함
 * - people(일정 인원): 앉을 수 있는 크기
 * - onlyAvailable: 빈 의자가 있고, 테이블이면 인원만큼 비어 있다
 */
export function matchesFilter(seat: Seat, filter: SeatFilterState, people: number | null, statuses: ChairStatusMap | null): boolean {
  if (!filter.features.every((f) => seat.features.includes(f))) return false;
  if (!fitsPeople(seat, people)) return false;
  if (filter.onlyAvailable) {
    const free = freeChairIds(seat, statuses).length;
    if (free === 0) return false;
    if (people !== null && seat.type === "TABLE" && free < people) return false;
  }
  return true;
}
