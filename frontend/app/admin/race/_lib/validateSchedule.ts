// 경주 시간표 검증 — 순수 함수. 통과하면 null, 아니면 첫 번째 오류 문구.
import { isRaceTime, normalizeRaceTimes } from "@/lib/raceSchedule";
import { formatKstTime, minutesOf } from "@/lib/kst";
import { changeEffectiveFrom, getRaceStartsBetween, kstMidnight, RACE_LIVE_MS } from "@/lib/time";

export const SCHEDULE_LIMITS = {
  maxPerDay: 6,
  /** 경주 사이 최소 간격 — LIVE 창(출발 뒤 10분)이 겹치면 무대가 앞 경주에 머문다. 여유를 두어 20분 */
  minGapMinutes: 20,
  /** 이 시각 뒤로는 둘 수 없다 — LIVE 창이 자정을 넘으면 일정 계산(오늘 · 내일만 본다)이 어긋난다 */
  lastStart: "23:49",
};

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function formatGap(minutes: number): string {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

/** "HH:MM" 사이의 분 차이를 고려해 너무 가까운 짝을 찾는다(자정을 넘는 마지막 → 첫 경주 포함) */
function tooClosePair(sorted: string[]): [string, string] | null {
  for (let i = 1; i < sorted.length; i++) {
    if (minutesOf(sorted[i]) - minutesOf(sorted[i - 1]) < SCHEDULE_LIMITS.minGapMinutes) return [sorted[i - 1], sorted[i]];
  }
  if (sorted.length > 1) {
    const wrap = minutesOf(sorted[0]) + 24 * 60 - minutesOf(sorted[sorted.length - 1]);
    if (wrap < SCHEDULE_LIMITS.minGapMinutes) return [sorted[sorted.length - 1], sorted[0]];
  }
  return null;
}

/**
 * 새 시간표를 검사한다. now 는 저장하려는 시각 — 바꾼 시간표의 첫 경주가 방금 출발한(또는 곧 출발하는) 경주와 너무 가깝지 않은지도 본다.
 * (시간표는 지금 뒤에 출발하는 경주부터 적용되므로, 그 경계에서도 경주 사이 간격이 지켜져야 한다)
 */
export function validateRaceTimes(times: readonly string[], now: number): string | null {
  if (times.length === 0) return "경주 시각을 하나 이상 두어야 해요.";
  if (!times.every(isRaceTime)) return "시각은 24시간제 HH:MM 형식이어야 해요(예: 18:00).";
  const sorted = normalizeRaceTimes(times);
  if (sorted.length !== times.length) return "같은 시각이 두 번 들어 있어요.";
  if (sorted.length > SCHEDULE_LIMITS.maxPerDay) return `하루 최대 ${SCHEDULE_LIMITS.maxPerDay}경주까지 둘 수 있어요.`;
  const late = sorted.find((t) => t > SCHEDULE_LIMITS.lastStart);
  if (late) return `${late} — 23:50 이후에는 경주를 둘 수 없어요(경주 시간이 자정을 넘어요).`;
  const pair = tooClosePair(sorted);
  if (pair) return `${pair[0]} 과 ${pair[1]} 경주가 너무 가까워요. 경주 사이는 ${SCHEDULE_LIMITS.minGapMinutes}분 이상 띄워 주세요.`;

  // 경계 — 남는 마지막 경주(이미 출발했거나, 마감돼 그대로 진행될 다음 경주)와 새 시간표의 첫 경주 사이
  const from = changeEffectiveFrom(now);
  const started = getRaceStartsBetween(now - RACE_LIVE_MS - SCHEDULE_LIMITS.minGapMinutes * MINUTE, now);
  const anchor = from > now ? from - 1 : (started[started.length - 1] ?? null);
  if (anchor === null) return null;
  const today = kstMidnight(now);
  // 시간표가 비어 있지 않으므로 내일 안에는 반드시 있다
  const firstNew = [today, today + DAY]
    .flatMap((day) => sorted.map((t) => day + minutesOf(t) * MINUTE))
    .filter((at) => at > from)
    .sort((a, b) => a - b)[0];
  const gap = Math.round((firstNew - anchor) / MINUTE);
  if (gap < SCHEDULE_LIMITS.minGapMinutes) {
    const what = from > now ? "곧 출발하는" : "방금 출발한";
    return `${what} ${formatKstTime(anchor)} 경주와 새 ${formatKstTime(firstNew)} 경주가 ${formatGap(gap)}밖에 차이 나지 않아요. ${SCHEDULE_LIMITS.minGapMinutes}분 이상 띄워 주세요.`;
  }
  return null;
}
