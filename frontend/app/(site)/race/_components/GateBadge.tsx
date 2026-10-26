import { textOn } from "../_lib/records";
import type { Horse } from "../_types";
import styles from "./race.module.css";

/**
 * 게이트 번호 원형 배지 — 대표색(조끼 색) 바탕, 글자색은 대비에 맞춰 흰색/짙은 색.
 * 번호는 말 id 가 아니라 **그 경주의** 게이트 번호다(records.raceGates) — 같은 말도 경주마다 번호가 바뀐다.
 */
export default function GateBadge({ horse, gate, size = "md" }: { horse: Horse; gate: number; size?: "sm" | "md" }) {
  return (
    <span
      className={`${styles.gate} ${size === "sm" ? styles.gateSm : ""}`}
      style={{ background: horse.color, color: textOn(horse.color) }}
      aria-hidden
    >
      {gate}
    </span>
  );
}
