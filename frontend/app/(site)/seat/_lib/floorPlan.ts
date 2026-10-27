// 지점 평면도 JSON(백엔드 branches.sections · fixtures, JSON 원문 문자열) → 화면 타입. 순수 함수 — /seat 와 관리자 좌석 화면이 함께 쓴다.
// 서버는 JSON 배열인지만 확인하므로, 비었거나 깨진 값은 빈 배열로 본다(구조물 없이 좌석만 그린다).
import type { FloorFixture, FloorPlan, FloorSection } from "../_types";

function parseArray<T>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

export function parseFloorPlan(sections: string | null | undefined, fixtures: string | null | undefined): FloorPlan {
  return { sections: parseArray<FloorSection>(sections), fixtures: parseArray<FloorFixture>(fixtures) };
}
