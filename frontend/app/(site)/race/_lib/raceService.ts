// 레이스 도메인의 데이터 창구 — 백엔드 연결 시 이 파일만 fetch 로 교체한다.
// 쿠폰 차감(useUser().spendCoupon)과 진행 상태(RaceProvider)는 호출한 쪽(useRace)이 반영하고,
// 정산(결과 → 쿠폰 돌려주기)은 루트의 RaceSettlement 가 getRaceResult 로 결과를 받아 한다.
import { HORSES } from "../_data/horses";
import { RACE_HISTORY } from "../_data/raceHistory";
import type { Horse, RaceBet, RaceResult } from "../_types";
import { RACE_SETTLE_MS, simulateRace } from "./simulation";

/** GET /api/horses */
export async function getHorses(): Promise<Horse[]> {
  return structuredClone(HORSES);
}

/** GET /api/races/history — 최신 경주가 앞 */
export async function getRaceHistory(): Promise<RaceResult[]> {
  return structuredClone(RACE_HISTORY);
}

/** POST /api/races/{raceNo}/bets — 지금은 성공만 돌려준다(쿠폰 차감 · 중복 참가 확인은 서버 몫) */
export async function placeBet(raceNo: number, startsAt: string, horseId: number): Promise<RaceBet> {
  return { raceNo, startsAt, horseId, placedAt: new Date().toISOString() };
}

/**
 * GET /api/races/{raceNo}/result — 결과가 확정되기 전(출발 + RACE_SETTLE_MS 전)이면 null.
 * Mock 은 /race 트랙과 같은 결정적 시뮬레이션(경주 번호 + 출발 시각 시드)으로 만들어 트랙에서 본 순위와 같다.
 */
export async function getRaceResult(raceNo: number, startsAt: string): Promise<RaceResult | null> {
  const at = Date.parse(startsAt);
  if (Date.now() < at + RACE_SETTLE_MS) return null;
  return { raceNo, date: new Date(at).toISOString(), ranking: simulateRace(HORSES, raceNo, at).ranking };
}
