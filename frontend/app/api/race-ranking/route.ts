// 경주 순위 계산 — Spring 정산 스케줄러만 부르는 서버 간 API(사용자 결정 2026-10-26 "C안").
// Spring 이 경주의 시드(races.seed)와 그 경주에서 쓴 주행 성향(race_horses.trait)을 보내면, 경기 화면과 같은 simulateRace 로
// 도착 순서를 돌려준다. 상태를 저장하지 않는 계산기라 같은 입력이면 언제나 같은 순위다.
// 공유 키(X-Race-Ranking-Key, 환경변수 RACE_RANKING_KEY)가 맞을 때만 계산한다 — 개발 중에는 키가 없으면 개발용 기본값을 쓴다.
import { simulateRace, type SimHorse } from "@/app/(site)/race/_lib/simulation";
import type { HorseTrait } from "@/app/(site)/race/_types";

const KEY_HEADER = "x-race-ranking-key";
const DEV_KEY = "dev-race-ranking-key"; // Spring application.yml 의 race.ranking.key 기본값과 같다
const TRAITS: readonly HorseTrait[] = ["FAST_START", "STEADY", "LATE_SPURT", "WILDCARD", "BALANCED"];
const HORSE_COUNT = 7;

interface RankingRequest {
  raceNo: number;
  startTime: string; // ISO — 로그 · 응답 확인용(순위는 seed 로만 정해진다)
  seed: number; // 0 ~ 2^32-1
  horses: { id: number; trait: HorseTrait }[];
}

function rankingKey(): string | undefined {
  return process.env.RACE_RANKING_KEY || (process.env.NODE_ENV === "production" ? undefined : DEV_KEY);
}

/** 요청 본문 검사 — 통과하면 null, 아니면 오류 문구 */
function invalidReason(body: Partial<RankingRequest> | null): string | null {
  if (!body || typeof body !== "object") return "요청 본문이 없습니다.";
  if (!Number.isInteger(body.raceNo)) return "raceNo 가 필요합니다.";
  if (typeof body.startTime !== "string" || Number.isNaN(Date.parse(body.startTime))) return "startTime 은 ISO 시각이어야 합니다.";
  if (!Number.isInteger(body.seed) || body.seed! < 0 || body.seed! > 0xffffffff) return "seed 는 0 ~ 4294967295 정수여야 합니다.";
  const horses = body.horses;
  if (!Array.isArray(horses) || horses.length !== HORSE_COUNT) return `horses 는 ${HORSE_COUNT}마리여야 합니다.`;
  if (!horses.every((h) => Number.isInteger(h?.id) && TRAITS.includes(h?.trait))) return "horses 의 id · trait 가 올바르지 않습니다.";
  if (new Set(horses.map((h) => h.id)).size !== HORSE_COUNT) return "같은 말이 두 번 들어 있습니다.";
  return null;
}

/** POST /api/race-ranking — { raceNo, startTime, seed, horses: [{ id, trait }] } → { raceNo, ranking: [말 id 1위~7위], doneAt } */
export async function POST(request: Request) {
  const key = rankingKey();
  if (!key || request.headers.get(KEY_HEADER) !== key) {
    return Response.json({ code: "RANKING_FORBIDDEN", message: "순위 계산 키가 맞지 않습니다." }, { status: 401 });
  }

  let body: Partial<RankingRequest> | null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const problem = invalidReason(body);
  if (problem) return Response.json({ code: "RANKING_BAD_REQUEST", message: problem }, { status: 400 });

  const { raceNo, startTime, seed, horses } = body as RankingRequest;
  // 난수를 말 id 순서대로 쓰므로 순서를 고정한다 — 순서가 바뀌면 순위가 달라진다(경기 화면도 말 id 순)
  const ordered: SimHorse[] = [...horses].sort((a, b) => a.id - b.id).map(({ id, trait }) => ({ id, trait }));
  const { ranking, doneAt } = simulateRace(ordered, raceNo, Date.parse(startTime), seed);
  return Response.json({ raceNo, ranking, doneAt });
}
