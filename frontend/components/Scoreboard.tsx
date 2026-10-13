import styles from "./ui.module.css";

interface ScoreboardProps {
  /** "01:24:32", "12/30" 처럼 문자열. 숫자·문자는 칸막이 셀로, ":" "/" 는 구분자로 그린다. */
  value: string;
  size?: "sm" | "md" | "lg";
  /** 스크린리더용 설명 (없으면 value) */
  label?: string;
  /** 어두운 배경 위(메인 히어로)에서 쓸 때 */
  onDark?: boolean;
}

const SEPARATORS = new Set([":", "/", ".", " "]);

/** 전광판 스타일 숫자 박스 — 카운트다운·좌석 수 공용 */
export default function Scoreboard({ value, size = "md", label, onDark = false }: ScoreboardProps) {
  return (
    <span
      className={`${styles.board} ${styles[`board_${size}`]} ${onDark ? styles.boardOnDark : ""}`}
      role="img"
      aria-label={label ?? value}
    >
      {Array.from(value).map((ch, i) =>
        SEPARATORS.has(ch) ? (
          <span key={i} className={styles.boardSep} aria-hidden>
            {ch}
          </span>
        ) : (
          <span key={i} className={styles.boardCell} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
