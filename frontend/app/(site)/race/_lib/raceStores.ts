// 레이스 화면들이 함께 쓰는 서버 데이터 저장소(lib/remoteStore) — 출전마 · 지난 기록 · 내 걸기 · 연패 위로 쿠폰 · 관리자 경주 목록.
// 경주 일정은 lib/time.ts 도 읽으므로 lib/raceSchedule.ts 에 따로 있다. 화면은 _hooks/useRaceData 의 훅으로 구독한다.
import type { RaceEntry } from "@/types/common";
import { createRemoteStore } from "@/lib/remoteStore";
import type { Horse, LosingStreakStatus, ServerRace } from "../_types";
import { getAdminRaces, getHorses, getMyBets, getMyLosingStreak, getRaceHistory } from "./raceService";

const NO_HORSES: Horse[] = [];
const NO_RACES: ServerRace[] = [];
const NO_BETS: RaceEntry[] = [];

/** 출전마 7마리(말 id 순) — 관리자가 고치면 그 화면이 refresh() 한다 */
export const horsesStore = createRemoteStore(getHorses, NO_HORSES, 5 * 60_000);

/** 정산된 경주, 최신순 — 경주가 정산되면 RaceSettlement 가 refresh() 한다 */
export const raceHistoryStore = createRemoteStore(getRaceHistory, NO_RACES, 60_000);

/** 내 걸기 기록, 최신순(로그인하지 않았으면 빈 목록) — 걸기 · 정산 · 로그인/로그아웃 때 refresh() */
export const myBetsStore = createRemoteStore(getMyBets, NO_BETS, 30_000);

/** 내 연패 위로 쿠폰 상태(로그인하지 않았으면 null) — 정산 · 로그인/로그아웃 · 지급 예정 시각에 refresh() */
export const losingStreakStore = createRemoteStore<LosingStreakStatus | null>(getMyLosingStreak, null, 60_000);

/** 관리자 경주 목록(모든 경주, 최신순) — ADMIN 이 아니면 error(401 · 403). /admin/race 만 구독한다 */
export const adminRacesStore = createRemoteStore(getAdminRaces, NO_RACES, 30_000);
