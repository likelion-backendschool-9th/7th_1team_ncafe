// 레이스 도메인의 데이터 창구 — 백엔드 연결 시 이 파일만 fetch 로 교체한다.
// 쿠폰 차감(useUser().spendCoupon)과 진행 상태(RaceProvider)는 호출한 쪽(useRace)이 반영한다.
import { HORSES } from "../_data/horses";
import { RACE_HISTORY } from "../_data/raceHistory";
import type { Horse, RaceBet, RaceResult } from "../_types";

/** GET /api/horses */
export async function getHorses(): Promise<Horse[]> {
  return structuredClone(HORSES);
}

/** GET /api/races/history — 최신 경주가 앞 */
export async function getRaceHistory(): Promise<RaceResult[]> {
  return structuredClone(RACE_HISTORY);
}

/** POST /api/races/{raceNo}/bets — 지금은 성공만 돌려준다(쿠폰 차감 · 중복 참가 확인은 서버 몫) */
export async function placeBet(raceNo: number, horseId: number): Promise<RaceBet> {
  return { raceNo, horseId, placedAt: new Date().toISOString() };
}
