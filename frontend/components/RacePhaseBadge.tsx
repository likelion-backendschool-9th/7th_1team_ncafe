import type { RacePhase } from "@/lib/time";
import styles from "./ui.module.css";

/**
 * 경주 단계 배지 — SOON(시작 10분 전부터, 테두리만) · LIVE(시작 후 10분, 빨강 + 깜빡이는 점).
 * UPCOMING 이나 시계를 읽기 전(null)에는 아무것도 그리지 않는다. 메인 히어로 · /race 공용.
 * SOON 은 currentColor 테두리라 어두운 히어로 위에서도 밝은 페이지에서도 그대로 쓴다.
 */
export default function RacePhaseBadge({ phase }: { phase: RacePhase | null }) {
  if (phase === "LIVE") {
    return (
      <span className={`${styles.phase} ${styles.phaseLive}`}>
        <span className={styles.phaseDot} aria-hidden />
        LIVE
        <span className="visually-hidden"> — 경주 진행 중</span>
      </span>
    );
  }
  if (phase === "SOON") {
    return (
      <span className={`${styles.phase} ${styles.phaseSoon}`}>
        SOON
        <span className="visually-hidden"> — 곧 출발</span>
      </span>
    );
  }
  return null;
}
