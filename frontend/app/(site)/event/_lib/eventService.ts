// 이벤트 도메인의 데이터 창구 — 백엔드 연결 시 이 파일만 fetch 로 교체한다.
import { EVENTS } from "../_data/events";
import type { CafeEvent } from "../_types";

/** GET /api/events — 진행 중인 이벤트 */
export async function getEvents(): Promise<CafeEvent[]> {
  return structuredClone(EVENTS);
}

// 추후(API)
// export async function getEvents() {
//   const res = await fetch(`${API_BASE}/api/events`);
//   return res.json() as Promise<CafeEvent[]>;
// }
