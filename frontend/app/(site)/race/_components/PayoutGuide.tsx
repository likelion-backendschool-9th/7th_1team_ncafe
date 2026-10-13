import { payoutTable, RACE_ENTRY_COUPONS } from "../_lib/payout";
import styles from "./race.module.css";

/**
 * 보상 안내 — "쿠폰 1장으로 참여 · [1위 4장] [2위 3장] [3위 2장] 돌려받기 (원금 포함)".
 * 숫자는 모두 _lib/payout.ts 에서 온다(수량을 바꾸면 여기도 바뀐다).
 */
export default function PayoutGuide({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`${styles.payout} ${compact ? styles.payoutCompact : ""}`}>
      <span className={styles.payoutLead}>쿠폰 {RACE_ENTRY_COUPONS}장으로 참여</span>
      <span className={styles.payoutChips}>
        {payoutTable().map((p) => (
          <span key={p.rank} className={styles.payoutChip}>
            {p.rank}위 <strong>{p.coupons}장</strong>
          </span>
        ))}
      </span>
      <span className={styles.payoutNote}>돌려받기 (원금 포함)</span>
    </p>
  );
}
