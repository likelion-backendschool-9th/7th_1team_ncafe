import type { FloorPlan } from "../_types";

/**
 * 평면도 구조물 · 구역 — BLUEPRINT 5.3. 좌표는 평면도(900×702) 기준 %(좌상단 x, y · 폭 w · 높이 h).
 * 창문은 위쪽 벽 전체, 바 테이블은 오른쪽 벽, 카운터 · 화장실은 오른쪽 아래, 출입구는 왼쪽 아래 벽이 끊긴 자리.
 * 통로는 폭(또는 높이) 0 인 점선이다. 세 지점이 같은 평면도를 쓴다.
 * 구역 윗선에는 이름표 알약이 걸리므로(아래로 11px) 그 구역의 첫 의자 줄은 윗선에서 16px 아래부터 둔다(seats.ts).
 */
export const FLOOR_PLAN: FloorPlan = {
  sections: [
    { section: "TRACKSIDE", x: 3.6, y: 5.7, w: 69.8, h: 21.4 },
    { section: "GRANDSTAND", x: 3.6, y: 29.3, w: 69.8, h: 40.7 },
    { section: "LOUNGE", x: 3.6, y: 73.2, w: 56.4, h: 22.8 },
    { section: "PADDOCK", x: 75.1, y: 5.7, w: 21.3, h: 64.4 },
  ],
  fixtures: [
    { id: "window", kind: "WINDOW", label: "WINDOW", labelKo: "창가", x: 0, y: 0, w: 100, h: 3.4 },
    { id: "bar", kind: "BAR", label: "BAR", x: 89.3, y: 8.3, w: 4.9, h: 58.4 },
    { id: "counter", kind: "COUNTER", label: "COUNTER", labelKo: "주문", x: 61.8, y: 73.2, w: 20.9, h: 22.8 },
    { id: "restroom", kind: "RESTROOM", label: "RESTROOM", labelKo: "화장실", x: 84.4, y: 73.2, w: 12, h: 22.8 },
    { id: "entrance", kind: "ENTRANCE", label: "ENTRANCE", labelKo: "출입구", x: 3.6, y: 97.7, w: 11.5, h: 2.3 },
    { id: "aisle-h", kind: "AISLE", label: "통로", x: 3.6, y: 71.1, w: 92.9, h: 0 },
    { id: "aisle-v", kind: "AISLE", label: "통로", x: 74.2, y: 5.7, w: 0, h: 64.4 },
  ],
};
