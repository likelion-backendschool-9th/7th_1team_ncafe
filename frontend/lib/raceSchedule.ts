// 경주 시간표 — 매일 열리는 경주 시각(KST "HH:MM")과 관리자 변경 이력. lib/time.ts 의 일정 계산이 여기서 시각을 읽는다.
// 기본 시간표는 빌드 환경변수 NEXT_PUBLIC_RACE_TIMES(없으면 12:30 · 18:00). 관리자(/admin/race)가 바꾸면 "버전"이 하나 쌓인다.
// 버전은 { from, times } — from(epoch ms) 뒤에 출발하는 경주부터 그 시각표를 쓴다. 그래서 이미 출발한 경주 · 지난 기록 · 경주 번호는
// 시간표를 바꿔도 그대로다(지나간 경주 보충이 시간표로 번호를 매기므로, 과거를 바꾸면 번호가 밀린다).
// Mock 단계에는 localStorage(같은 브라우저)에 두고, 백엔드가 붙으면 GET /api/races/schedule 응답이 이 자리를 맡는다.
import { createLocalStore } from "./localStore";

const DEFAULT_RACE_TIMES = ["12:30", "18:00"];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM"(24시간, 두 자리) 형식인가 */
export function isRaceTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** 중복을 없애고 이른 순으로 */
export function normalizeRaceTimes(times: readonly string[]): string[] {
  return [...new Set(times)].sort();
}

/** "12:30,18:00" 같은 문자열 → 검증 · 정렬된 시각 목록. 형식이 하나라도 틀리면 null(기본값 사용) */
function parseRaceTimesEnv(value: string | undefined): string[] | null {
  if (!value) return null;
  const times = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.padStart(5, "0"));
  if (times.length === 0 || !times.every(isRaceTime)) return null;
  return normalizeRaceTimes(times);
}

/**
 * 기본 시간표(이른 순). 테스트 · 발표 때는 빌드 환경변수 NEXT_PUBLIC_RACE_TIMES="12:30,18:00,15:20" 로 바꾼다.
 * 서버 렌더 · 정적 셸에는 항상 이 값이 들어간다(관리자 변경은 브라우저에서 하이드레이션 뒤에 반영).
 */
export const BASE_RACE_TIMES: readonly string[] = parseRaceTimesEnv(process.env.NEXT_PUBLIC_RACE_TIMES) ?? DEFAULT_RACE_TIMES;

export interface RaceScheduleVersion {
  from: number; // epoch ms — 이 시각 "뒤"에 출발하는 경주부터 적용
  times: string[]; // 이른 순
}

/** 이력이 너무 길어지지 않게(오래된 버전은 경주 기록 보충 범위 밖이다) */
const MAX_VERSIONS = 50;

function parseVersions(raw: unknown): RaceScheduleVersion[] | null {
  if (!Array.isArray(raw)) return null;
  const versions = raw.filter(
    (v): v is RaceScheduleVersion =>
      typeof v === "object" &&
      v !== null &&
      typeof v.from === "number" &&
      Array.isArray(v.times) &&
      v.times.length > 0 &&
      v.times.every((t: unknown) => typeof t === "string" && isRaceTime(t)),
  );
  return versions.length === raw.length ? versions : null;
}

const EMPTY: RaceScheduleVersion[] = [];

/** 시간표 변경 이력(오래된 순) — React 는 lib/useRaceTimes.ts 로 구독한다 */
export const raceScheduleStore = createLocalStore<RaceScheduleVersion[]>("ncafe.race.schedule.v1", EMPTY, parseVersions);

/** 시각 at 에 출발하는 경주가 따르는 시간표 — at 보다 먼저 정해진 마지막 버전, 없으면 기본 시간표 */
export function raceTimesAt(at: number, versions: readonly RaceScheduleVersion[] = raceScheduleStore.get()): readonly string[] {
  for (let i = versions.length - 1; i >= 0; i--) {
    if (versions[i].from < at) return versions[i].times;
  }
  return BASE_RACE_TIMES;
}

/** 지금 공지된 시간표(가장 최근 버전 — 아직 적용 전이어도) · 화면 문구 "매일 12:30 · 18:00" 용 */
export function announcedRaceTimes(versions: readonly RaceScheduleVersion[] = raceScheduleStore.get()): readonly string[] {
  return versions.length ? versions[versions.length - 1].times : BASE_RACE_TIMES;
}

/** 어느 버전에든 있었던 시각 전부(이른 순) — 하루의 경주 후보. 실제로 열리는지는 raceTimesAt 으로 거른다 */
export function candidateRaceTimes(versions: readonly RaceScheduleVersion[] = raceScheduleStore.get()): string[] {
  return normalizeRaceTimes([...BASE_RACE_TIMES, ...versions.flatMap((v) => v.times)]);
}

/** 새 시간표를 from 뒤부터 적용한다(from 은 이전 버전보다 앞설 수 없다) */
export function saveRaceTimes(times: readonly string[], from: number): RaceScheduleVersion {
  const versions = raceScheduleStore.get();
  const last = versions[versions.length - 1];
  const version = { from: Math.max(from, last?.from ?? from), times: normalizeRaceTimes(times) };
  raceScheduleStore.set([...versions, version].slice(-MAX_VERSIONS));
  return version;
}
