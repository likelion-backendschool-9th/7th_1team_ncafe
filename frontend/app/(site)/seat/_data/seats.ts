import type { Seat } from "../_types";

/**
 * 좌석 30자리(테이블 17 + 바석 13) = 의자 71석 — BLUEPRINT 5.2.
 * x, y 는 평면도(_lib/geometry.ts 의 FLOOR, 900×702) 기준 % — 위치를 옮기려면 이 값만 고친다(지시서 21절).
 * 테이블 크기는 인원수로 정해지고(geometry.tableSize), 의자는 위아래 줄에 자동으로 붙는다.
 * 각 구역의 첫 줄은 구역 윗선에서 16px 아래부터(구역 사이 14px · 윗줄과 이름표 사이 13px 이상) 의자가 시작하도록 y 를 잡았다(구역 이름표와 겹치지 않게).
 * 상태(이용 가능 · 사용 중 · 예약 · 수리 중)는 지점 · 날짜 · 시간대마다 달라 여기 두지 않는다(_lib/mockStatus.ts).
 */
export const SEATS: Seat[] = [
  // TRACKSIDE 창가 좌석 — 창문 바로 아래 한 줄
  { id: "T01", section: "TRACKSIDE", type: "TABLE", capacity: 2, x: 8.2, y: 16.8, features: ["WINDOW", "OUTLET"] },
  { id: "T02", section: "TRACKSIDE", type: "TABLE", capacity: 2, x: 18.0, y: 16.8, features: ["WINDOW"] },
  { id: "T03", section: "TRACKSIDE", type: "TABLE", capacity: 4, x: 30.4, y: 16.8, features: ["WINDOW", "OUTLET"] },
  { id: "T04", section: "TRACKSIDE", type: "TABLE", capacity: 2, x: 42.9, y: 16.8, features: ["WINDOW", "QUIET"] },
  { id: "T05", section: "TRACKSIDE", type: "TABLE", capacity: 2, x: 52.7, y: 16.8, features: ["WINDOW"] },
  { id: "T06", section: "TRACKSIDE", type: "TABLE", capacity: 4, x: 65.1, y: 16.8, features: ["WINDOW", "OUTLET"] },

  // GRANDSTAND 일반 좌석 — 두 줄
  { id: "T07", section: "GRANDSTAND", type: "TABLE", capacity: 4, x: 15.1, y: 40.5, features: ["OUTLET"] },
  { id: "T08", section: "GRANDSTAND", type: "TABLE", capacity: 2, x: 31.6, y: 40.5, features: ["QUIET"] },
  { id: "T09", section: "GRANDSTAND", type: "TABLE", capacity: 2, x: 45.3, y: 40.5, features: ["QUIET", "OUTLET"] },
  { id: "T10", section: "GRANDSTAND", type: "TABLE", capacity: 4, x: 61.8, y: 40.5, features: [] },
  { id: "T11", section: "GRANDSTAND", type: "TABLE", capacity: 2, x: 15.1, y: 59.8, features: ["QUIET"] },
  { id: "T12", section: "GRANDSTAND", type: "TABLE", capacity: 2, x: 28.9, y: 59.8, features: [] },
  { id: "T13", section: "GRANDSTAND", type: "TABLE", capacity: 4, x: 45.3, y: 59.8, features: ["NEAR_COUNTER"] },
  { id: "T14", section: "GRANDSTAND", type: "TABLE", capacity: 2, x: 61.8, y: 59.8, features: ["NEAR_COUNTER", "OUTLET"] },

  // LOUNGE 단체 좌석 — 아래쪽 한 줄
  { id: "T15", section: "LOUNGE", type: "TABLE", capacity: 6, x: 12.0, y: 84.3, features: ["GROUP"] },
  { id: "T16", section: "LOUNGE", type: "TABLE", capacity: 6, x: 29.6, y: 84.3, features: ["GROUP", "OUTLET"] },
  { id: "T17", section: "LOUNGE", type: "TABLE", capacity: 8, x: 49.3, y: 84.3, features: ["GROUP", "OUTLET"] },

  // PADDOCK BAR 바 좌석 — 오른쪽 벽 바 테이블 앞 세로 한 줄(전부 콘센트)
  { id: "B01", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 11.4, features: ["BAR", "OUTLET"] },
  { id: "B02", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 15.7, features: ["BAR", "OUTLET"] },
  { id: "B03", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 19.9, features: ["BAR", "OUTLET"] },
  { id: "B04", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 24.2, features: ["BAR", "OUTLET"] },
  { id: "B05", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 28.5, features: ["BAR", "OUTLET"] },
  { id: "B06", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 32.8, features: ["BAR", "OUTLET"] },
  { id: "B07", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 37.0, features: ["BAR", "OUTLET"] },
  { id: "B08", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 41.3, features: ["BAR", "OUTLET"] },
  { id: "B09", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 45.6, features: ["BAR", "OUTLET"] },
  { id: "B10", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 49.9, features: ["BAR", "OUTLET"] },
  { id: "B11", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 54.1, features: ["BAR", "OUTLET"] },
  { id: "B12", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 58.4, features: ["BAR", "OUTLET", "NEAR_COUNTER"] },
  { id: "B13", section: "PADDOCK", type: "BAR", capacity: 1, x: 86.2, y: 62.7, features: ["BAR", "OUTLET", "NEAR_COUNTER"] },
];
