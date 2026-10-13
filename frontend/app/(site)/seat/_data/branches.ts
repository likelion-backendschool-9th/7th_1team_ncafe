import type { Branch } from "../_types";

/** 지점 3곳(Mock, 사용자 결정 2026-10-13) — 평면도는 같고 좌석 상태만 지점마다 다르다. 첫 번째가 기본 선택. */
export const BRANCHES: Branch[] = [
  { id: "mapo", name: "마포 본점", address: "서울시 마포구 트랙길 7, 1층" },
  { id: "gangnam", name: "강남점", address: "서울시 강남구 더비로 21, 2층" },
  { id: "seongsu", name: "성수점", address: "서울시 성동구 패독길 5, 1층" },
];
