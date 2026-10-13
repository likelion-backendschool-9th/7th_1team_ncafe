import { textOn } from "../_lib/records";
import type { Horse } from "../_types";
import styles from "./race.module.css";

/** 게이트 번호 원형 배지 — 대표색(조끼 색) 바탕, 글자색은 대비에 맞춰 흰색/짙은 색 */
export default function GateBadge({ horse, size = "md" }: { horse: Horse; size?: "sm" | "md" }) {
  return (
    <span
      className={`${styles.gate} ${size === "sm" ? styles.gateSm : ""}`}
      style={{ background: horse.color, color: textOn(horse.color) }}
      aria-hidden
    >
      {horse.id}
    </span>
  );
}
