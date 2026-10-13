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
