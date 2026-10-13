// 레이스 쿠폰 규칙(BLUEPRINT 7 "쿠폰 규칙") — 수량은 우선값이라 게임을 해 본 뒤 이 파일만 고친다.

/** 한 경주에 거는 쿠폰 수(고정) */
export const RACE_ENTRY_COUPONS = 1;

/** 순위별로 결과 때 돌려받는 쿠폰 수(원금 포함). 표에 없는 순위(4위 이하)는 0 */
export const RACE_PAYOUT: Readonly<Record<number, number>> = { 1: 4, 2: 3, 3: 2 };

export function payoutFor(rank: number): number {
  return RACE_PAYOUT[rank] ?? 0;
}

/** [{ rank: 1, coupons: 4 }, …] — 순위 순 */
export function payoutTable(): { rank: number; coupons: number }[] {
  return Object.entries(RACE_PAYOUT)
    .map(([rank, coupons]) => ({ rank: Number(rank), coupons }))
    .sort((a, b) => a.rank - b.rank);
}

/** "1위 4장 · 2위 3장 · 3위 2장" */
export function payoutSummary(): string {
  return payoutTable()
    .map((p) => `${p.rank}위 ${p.coupons}장`)
    .join(" · ");
}

/** 돌려받은 쿠폰의 구성 — "원금 1 + 추가 3". 돌려받지 못했으면(0장) 빈 문자열 */
export function payoutBreakdown(payout: number): string {
  return payout > 0 ? `원금 ${RACE_ENTRY_COUPONS} + 추가 ${payout - RACE_ENTRY_COUPONS}` : "";
}

/** 정산 쿠폰 내역 문구 — "Race #13 · 1위 (원금 1 + 추가 3)" */
export function payoutLabel(raceNo: number, rank: number, payout: number): string {
  return `Race #${raceNo} · ${rank}위 (${payoutBreakdown(payout)})`;
}
