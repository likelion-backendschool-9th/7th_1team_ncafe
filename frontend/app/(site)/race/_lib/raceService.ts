// 레이스 도메인의 데이터 창구 — 백엔드 연결 시 이 파일만 fetch 로 교체한다.
// 쿠폰 차감(useUser().spendCoupon)과 진행 상태(RaceProvider)는 호출한 쪽(useRace)이 반영하고,
// 정산(결과 → 쿠폰 돌려주기)은 루트의 RaceSettlement 가 getRaceResult 로 결과를 받아 한다.
// 관리자(/admin/race)의 쓰기 — 출전마 수정 · 시간표 변경 — 는 Mock 단계에서 localStorage 저장소(_lib/horseStore · lib/raceSchedule)에 남겨
// 같은 브라우저의 사용자 화면에도 보이게 한다(사용자 결정 2026-10-14). 화면은 useRaceHorses · useRaceTimes 로 구독한다.
import { announcedRaceTimes, saveRaceTimes, type RaceScheduleVersion } from "@/lib/raceSchedule";
import { changeEffectiveFrom } from "@/lib/time";
import { RACE_HISTORY } from "../_data/raceHistory";
import type { Horse, HorseCondition, HorseInput, RaceBet, RaceResult } from "../_types";
import { mockConditions } from "./condition";
import { latestHorses, raceHorsesAt, saveHorses } from "./horseStore";
import { latestRaceAt, raceStartAt, settledRaceUntil } from "./records";
import { simulateRace } from "./simulation";

/** GET /api/horses — 서버 렌더에서는 기본값, 브라우저에서는 관리자 변경까지 */
export async function getHorses(): Promise<Horse[]> {
  return structuredClone(latestHorses());
}

/** GET /api/races/history — 최신 경주가 앞 */
export async function getRaceHistory(): Promise<RaceResult[]> {
  return structuredClone(RACE_HISTORY);
}

/** GET /api/horses/conditions?date — 그 날(KST)의 컨디션, 말 id → 컨디션. 표시용이라 경주 결과에는 영향이 없다 */
export async function getHorseConditions(date: string): Promise<Record<number, HorseCondition>> {
  return mockConditions(
    latestHorses().map((h) => h.id),
    date,
  );
}

/** POST /api/races/{raceNo}/bets — 지금은 성공만 돌려준다(쿠폰 차감 · 중복 참가 확인은 서버 몫) */
export async function placeBet(raceNo: number, startsAt: string, horseId: number): Promise<RaceBet> {
  return { raceNo, startsAt, horseId, placedAt: new Date().toISOString() };
}

/**
 * GET /api/races/{raceNo}/result — 결과가 확정되기 전(출발 + RACE_SETTLE_MS 전)이면 null.
 * Mock 은 /race 트랙과 같은 결정적 시뮬레이션(경주 번호 + 출발 시각 시드, 그 경주 당시의 출전마)으로 만들어 트랙에서 본 순위와 같다.
 * 출발 시각은 시간표에서 "N번째 경주"로 찾는다 — 걸어 둔 경주의 시각을 관리자가 바꿔도 같은 번호의 실제 경주 결과를 받는다.
 */
export async function getRaceResult(raceNo: number): Promise<RaceResult | null> {
  const record = RACE_HISTORY.find((r) => r.raceNo === raceNo);
  if (record) return structuredClone(record);
  const at = raceStartAt(RACE_HISTORY, raceNo, settledRaceUntil(latestRaceAt(RACE_HISTORY), Date.now()));
  if (at === null) return null;
  return { raceNo, date: new Date(at).toISOString(), ranking: simulateRace(raceHorsesAt(at), raceNo, at).ranking };
}

// ---------- 관리자 ----------

/**
 * PUT /api/admin/horses/{id} — 출전마 정보 수정(7마리 고정, id 는 그대로).
 * 지금부터 적용하되 다음 경주가 이미 마감됐으면 그 경주가 출발한 뒤부터(changeEffectiveFrom) — 성향은 이미 출발한 경주의 결과를 바꾸지 않는다.
 */
export async function updateHorse(id: number, input: HorseInput): Promise<{ horse: Horse; from: number }> {
  const current = latestHorses();
  if (!current.some((h) => h.id === id)) throw new Error(`horse ${id} not found`);
  const horse: Horse = { ...input, id };
  const version = saveHorses(
    current.map((h) => (h.id === id ? horse : h)),
    changeEffectiveFrom(Date.now()),
  );
  return { horse: structuredClone(horse), from: version.from };
}

/** GET /api/races/schedule — 지금 공지된 경주 시각(이른 순) */
export async function getRaceTimes(): Promise<string[]> {
  return [...announcedRaceTimes()];
}

/**
 * PUT /api/admin/races/schedule — 매일 열리는 경주 시각을 바꾼다. 이미 출발한 경주와 기록은 그대로이고
 * 지금 뒤에 출발하는 경주부터 새 시간표를 따른다(다음 경주가 마감 뒤면 그 경주 다음부터). 검증은 호출한 쪽(validateRaceTimes)이 한다.
 */
export async function updateRaceTimes(times: string[]): Promise<RaceScheduleVersion> {
  return saveRaceTimes(times, changeEffectiveFrom(Date.now()));
}
