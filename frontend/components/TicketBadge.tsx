import type { ReactNode } from "react";
import styles from "./ui.module.css";

export type TicketTone = "BEST" | "WINNER" | "NEW" | "PICK";

const TONE_CLASS: Record<TicketTone, string> = {
  BEST: styles.badgeBest,
  WINNER: styles.badgeWinner,
  NEW: styles.badgeNew,
  PICK: styles.badgePick,
};

/** 경마 티켓 모양 배지 — 양옆에 펀치 구멍이 뚫린 작은 티켓 */
export default function TicketBadge({ tone, children }: { tone: TicketTone; children?: ReactNode }) {
  return (
    <span className={`${styles.badge} ${TONE_CLASS[tone]}`}>
      {tone === "WINNER" && <span aria-hidden>★</span>}
      {children ?? (tone === "PICK" ? "MY PICK" : tone)}
    </span>
  );
}
