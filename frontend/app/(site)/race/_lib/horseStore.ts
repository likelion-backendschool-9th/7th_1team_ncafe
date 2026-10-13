// 출전마 저장소 — 기본값(_data/horses.ts) + 관리자 변경 이력(localStorage, 사용자 결정 2026-10-14: 같은 브라우저 사용자 화면에도 반영).
// 변경은 "버전"으로 쌓인다: { from, horses } — from(epoch ms) 뒤에 출발하는 경주부터 그 출전마 정보로 시뮬레이션한다.
// 주행 성향(trait)이 경주 결과를 바꾸므로, 이미 출발한 경주 · 지나간 경주 보충은 그 경주 당시의 성향으로 계산해야 기록이 바뀌지 않는다.
// 이름 · 색 · 이미지 같은 표시 정보는 가장 최근 버전을 쓴다(지난 기록에도 지금 이름이 보인다).
// raceService 가 읽고 쓰며, 화면은 _hooks/useRaceHorses 로 구독한다. 백엔드가 붙으면 이 파일은 지운다.
import { createLocalStore } from "@/lib/localStore";
import { HORSES } from "../_data/horses";
import type { Horse, HorseTrait } from "../_types";

export interface HorseVersion {
  from: number; // epoch ms — 이 시각 "뒤"에 출발하는 경주부터 적용
  horses: Horse[];
}

export const HORSE_TRAITS: readonly HorseTrait[] = ["FAST_START", "STEADY", "LATE_SPURT", "WILDCARD", "BALANCED"];

/** 관리자 폼에서 고를 수 있는 이미지 — 출전마 7장(트랙 장면도 이 이미지를 쓴다) */
export const HORSE_IMAGES: readonly string[] = HORSES.map((h) => h.image);

const MAX_VERSIONS = 50;

function isHorse(v: unknown): v is Horse {
  if (typeof v !== "object" || v === null) return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.id === "number" &&
    typeof h.name === "string" &&
    typeof h.nameKo === "string" &&
    typeof h.color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(h.color) &&
    typeof h.colorName === "string" &&
    typeof h.image === "string" &&
    typeof h.personality === "string" &&
    typeof h.description === "string" &&
    HORSE_TRAITS.includes(h.trait as HorseTrait)
  );
}

function parseVersions(raw: unknown): HorseVersion[] | null {
  if (!Array.isArray(raw)) return null;
  const ok = raw.every(
    (v) => typeof v === "object" && v !== null && typeof v.from === "number" && Array.isArray(v.horses) && v.horses.every(isHorse),
  );
  return ok ? (raw as HorseVersion[]) : null;
}

const EMPTY: HorseVersion[] = [];

export const horseStore = createLocalStore<HorseVersion[]>("ncafe.race.horses.v1", EMPTY, parseVersions);

/** base 의 말마다 edited 의 같은 id 로 바꾼다(말 id 순서 · 7마리 구성은 base 그대로) */
function merge(base: Horse[], edited: Horse[]): Horse[] {
  return base.map((h) => edited.find((e) => e.id === h.id) ?? h);
}

/** 지금 출전마(가장 최근 버전) — 화면 · 관리자용. 변경이 없으면 base 를 그대로 돌려준다 */
export function latestHorses(versions: readonly HorseVersion[] = horseStore.get(), base: Horse[] = HORSES): Horse[] {
  return versions.length ? merge(base, versions[versions.length - 1].horses) : base;
}

/** 시각 at 에 출발하는 경주의 출전마(말 id 순) — 시뮬레이션 전용. 그 경주보다 먼저 정해진 마지막 버전, 없으면 기본값 */
export function raceHorsesAt(at: number, versions: readonly HorseVersion[] = horseStore.get()): Horse[] {
  for (let i = versions.length - 1; i >= 0; i--) {
    if (versions[i].from < at) return merge(HORSES, versions[i].horses);
  }
  return HORSES;
}

/** 출전마 정보를 from 뒤부터 적용한다(from 은 이전 버전보다 앞설 수 없다) */
export function saveHorses(horses: Horse[], from: number): HorseVersion {
  const versions = horseStore.get();
  const last = versions[versions.length - 1];
  const version = { from: Math.max(from, last?.from ?? from), horses };
  horseStore.set([...versions, version].slice(-MAX_VERSIONS));
  return version;
}

/** 기본값(코드의 _data/horses.ts) — 관리자 폼의 "기본값으로 되돌리기" */
export function defaultHorse(id: number): Horse | null {
  return HORSES.find((h) => h.id === id) ?? null;
}
