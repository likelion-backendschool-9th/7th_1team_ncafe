// 경주 일정 검증 — 순수 함수(사용자 결정 2026-10-27). 통과하면 null, 아니면 첫 번째 오류 · 안내 문구.
// 서버(admin RaceService)가 같은 규칙으로 다시 검사한다. 쿠폰이 걸린 경주(다른 손님의 걸기 포함)는 서버만 알아서 서버 오류 문구로 보여 준다.
import { formatRaceDate } from "@/lib/time";

export const SCHEDULE_RULES = {
  /** 지금부터 이 시간 안(또는 이미 지난 시각)의 경주는 추가 · 삭제할 수 없다 */
  leadMinutes: 1,
  /** 경주 사이 최소 간격 — LIVE 창(출발 뒤 10분)이 겹치면 무대가 앞 경주에 머문다. 여유를 두어 20분 */
  minGapMinutes: 20,
};

const MINUTE = 60 * 1000;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM"(24시간, 두 자리) 형식인가 — <input type="time"> 값 */
export function isRaceTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** "10/29 18:00" */
function label(at: number): string {
  return formatRaceDate(new Date(at).toISOString());
}

/** 새 경주(출발 시각 at)를 검사한다. starts 는 지금 일정의 출발 시각 */
export function validateNewRace(at: number, starts: readonly number[], now: number): string | null {
  if (at - now <= SCHEDULE_RULES.leadMinutes * MINUTE) {
    return `지금부터 ${SCHEDULE_RULES.leadMinutes}분 이내이거나 이미 지난 시각에는 경주를 추가할 수 없어요.`;
  }
  if (starts.includes(at)) return `${label(at)} 경주가 이미 있어요.`;
  const near = starts.find((s) => Math.abs(s - at) < SCHEDULE_RULES.minGapMinutes * MINUTE);
  if (near !== undefined) {
    return `${label(near)} 경주와 너무 가까워요. 경주 사이는 ${SCHEDULE_RULES.minGapMinutes}분 이상 띄워 주세요.`;
  }
  return null;
}

/** 아직 출발하지 않은 경주를 지울 수 없는 이유 — 지울 수 있으면 null. 출발 1분 전부터는 막는다(쿠폰이 걸린 경주는 서버가 막는다) */
export function deleteBlockReason(at: number, now: number): string | null {
  if (at - now <= SCHEDULE_RULES.leadMinutes * MINUTE) return `출발 ${SCHEDULE_RULES.leadMinutes}분 전부터는 삭제할 수 없어요.`;
  return null;
}
