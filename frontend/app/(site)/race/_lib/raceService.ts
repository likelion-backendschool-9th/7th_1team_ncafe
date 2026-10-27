// 레이스 도메인의 데이터 창구 — 백엔드(Spring) /api/v1/races/** · /api/v1/admin/** 를 부른다(lib/api.ts, next.config.ts 프록시).
// 응답(DTO)을 화면 타입(_types)으로 바꾸는 일도 여기서 한다. 브라우저에서만 부른다 — 서버 렌더에는 경주 데이터가 없다.
// 화면은 이 함수들을 직접 부르기보다 _lib/raceStores · lib/raceSchedule 의 저장소(주기적으로 다시 불러온다)를 구독한다.
// 쿠폰 차감 · 정산은 서버가 한다 — 걸기는 placeBet, 정산 결과는 경주(status SETTLED) · 내 걸기(settledAt)로 다시 불러와 본다.
import { api, ApiError } from "@/lib/api";
import type { RaceEntry } from "@/types/common";
import type { Horse, HorseCondition, HorseInput, HorseTrait, LosingStreakStatus, RaceRunner, ServerRace } from "../_types";

interface HorseDto {
  id: number;
  nameKor: string;
  nameEng: string;
  color: string;
  colorName: string | null;
  image: string | null;
  personality: string | null;
  trait: string;
  description: string | null;
}

interface RaceHorseDto {
  horse: HorseDto;
  trait: string;
  gateNo: number | null;
  ranking: number | null;
  condition: string | null;
}

interface RaceDto {
  no: number;
  startTime: string;
  status: "SCHEDULED" | "SETTLED";
  seed: number | null;
  horses: RaceHorseDto[];
}

interface BetDto {
  id: number;
  raceNo: number;
  startTime: string;
  horse: RaceHorseDto;
  couponsIn: number;
  couponsOut: number;
  bettedTime: string;
  settledTime: string | null;
}

function toHorse(d: HorseDto): Horse {
  return {
    id: d.id,
    name: d.nameEng,
    nameKo: d.nameKor,
    color: d.color,
    colorName: d.colorName ?? "",
    image: d.image ?? "",
    personality: d.personality ?? "",
    trait: d.trait as HorseTrait,
    description: d.description ?? "",
  };
}

function toRunner(d: RaceHorseDto): RaceRunner {
  return {
    horse: toHorse(d.horse),
    trait: d.trait as HorseTrait,
    gate: d.gateNo,
    rank: d.ranking,
    condition: d.condition as HorseCondition | null,
  };
}

function toRace(d: RaceDto): ServerRace {
  return { raceNo: d.no, startsAt: Date.parse(d.startTime), status: d.status, seed: d.seed, runners: d.horses.map(toRunner) };
}

/** 내 걸기 한 건 → 내 레이스 기록. 게이트 번호가 아직 없으면(첫 정산 전) 말 id 로 둔다 */
function toEntry(d: BetDto): RaceEntry {
  return {
    raceNo: d.raceNo,
    startsAt: d.startTime,
    horseId: d.horse.horse.id,
    placedAt: d.bettedTime,
    gate: d.horse.gateNo ?? d.horse.horse.id,
    rank: d.settledTime ? d.horse.ranking : null,
    payout: d.couponsOut,
    settledAt: d.settledTime,
  };
}

/** GET /api/v1/races/horses — 출전마 7마리(말 id 순) */
export async function getHorses(): Promise<Horse[]> {
  return (await api<HorseDto[]>("/races/horses")).map(toHorse);
}

/** GET /api/v1/races/schedule — 오늘(KST 0시)부터의 경주, 이른 순. 마감 전 경주는 시드가 비어 있다 */
export async function getRaceSchedule(): Promise<ServerRace[]> {
  return (await api<RaceDto[]>("/races/schedule")).map(toRace);
}

/** GET /api/v1/races — 정산된 경주, 최신순 */
export async function getRaceHistory(): Promise<ServerRace[]> {
  return (await api<RaceDto[]>("/races")).map(toRace);
}

/** POST /api/v1/races/{raceNo}/bets — 쿠폰 1장 차감 · 마감 · 중복 검사는 서버가 한다(실패하면 ApiError: COUPON_NOT_ENOUGH · RACE_CLOSED …) */
export async function placeBet(raceNo: number, horseId: number): Promise<RaceEntry> {
  return toEntry(await api<BetDto>(`/races/${raceNo}/bets`, { method: "POST", body: { horseId } }));
}

/** GET /api/v1/races/bets/me — 내 걸기 기록, 최신순. 로그인하지 않았으면 빈 목록 */
export async function getMyBets(): Promise<RaceEntry[]> {
  try {
    return (await api<BetDto[]>("/races/bets/me")).map(toEntry);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return [];
    throw e;
  }
}

interface MyLosingStreakDto {
  loseStreak: number;
  dueTime: string | null;
  coupons: number;
  latest: { id: number; delta: number; note: string; createdDate: string } | null;
}

/** GET /api/v1/me/coupons/losing-streak — 연패 수 · 위로 쿠폰 지급 예정 시각 · 최근 위로 쿠폰. 로그인하지 않았으면 null */
export async function getMyLosingStreak(): Promise<LosingStreakStatus | null> {
  try {
    const d = await api<MyLosingStreakDto>("/me/coupons/losing-streak");
    return {
      loseStreak: d.loseStreak,
      dueAt: d.dueTime ? Date.parse(d.dueTime) : null,
      coupons: d.coupons,
      latest: d.latest
        ? { id: d.latest.id, coupons: d.latest.delta, note: d.latest.note, grantedAt: Date.parse(d.latest.createdDate) }
        : null,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

// ---------- 관리자 (ADMIN 로그인 필요) ----------

/** GET /api/v1/admin/races — 모든 경주, 최신순 */
export async function getAdminRaces(): Promise<ServerRace[]> {
  return (await api<RaceDto[]>("/admin/races")).map(toRace);
}

/**
 * POST /api/v1/admin/races — 출발 시각만 보낸다. 번호 · 시드 · 출전마(성향 사본 · 게이트 · 컨디션)는 서버가 채운다.
 * 지금부터 1분 이내 · 지난 시각 · 20분 간격 · 쿠폰이 걸린 경주 앞은 서버가 막는다(ApiError).
 */
export async function createRace(startsAt: number): Promise<ServerRace> {
  return toRace(await api<RaceDto>("/admin/races", { method: "POST", body: { startTime: new Date(startsAt).toISOString() } }));
}

/** DELETE /api/v1/admin/races/{raceNo} — 출발 1분 전까지, 쿠폰이 걸리지 않은 경주만(서버가 막는다) */
export async function deleteRace(raceNo: number): Promise<void> {
  await api<void>(`/admin/races/${raceNo}`, { method: "DELETE" });
}

/** PUT /api/v1/admin/horses/{id} — 출전마 수정. 성향은 아직 마감 전인 경주에도 서버가 반영한다 */
export async function updateHorse(id: number, input: HorseInput): Promise<Horse> {
  const body = {
    nameKor: input.nameKo,
    nameEng: input.name,
    color: input.color,
    colorName: input.colorName,
    image: input.image,
    personality: input.personality,
    trait: input.trait,
    description: input.description,
  };
  return toHorse(await api<HorseDto>(`/admin/horses/${id}`, { method: "PUT", body }));
}
