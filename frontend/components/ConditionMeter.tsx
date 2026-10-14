import { CONDITION_LABEL, CONDITION_LEVEL, CONDITION_MAX } from "@/app/(site)/race/_lib/condition";
import type { HorseCondition } from "@/app/(site)/race/_types";
import styles from "./ui.module.css";

/** 게이지 칸 수 — 최상 20 · 좋음 15 · 보통 10 · 저조 5 칸을 채운다 */
const BARS = 20;

/**
 * 오늘의 컨디션 게이지(사용자 결정 2026-10-14) — 가는 세로 막대 20칸 중 단계만큼을 신호등 색으로 채운다.
 * caption 이 있으면 "컨디션 좋음" 제목 줄 아래 막대 줄(메인 TODAY'S RUNNERS), 없으면 "좋음 ▮▮▮…" 한 줄(/race 출전표 카드의 dt 옆).
 * condition 이 null 이면(날짜를 알기 전) 빈 칸 + "—".
 */
export default function ConditionMeter({ condition, caption }: { condition: HorseCondition | null; caption?: string }) {
  const level = condition ? CONDITION_LEVEL[condition] : 0;
  const filled = Math.round((level / CONDITION_MAX) * BARS);
  const word = (
    <strong className={styles.conditionWord}>
      {condition ? CONDITION_LABEL[condition] : "—"}
      {condition && (
        <span className="visually-hidden">
          {" "}
          ({CONDITION_MAX}단계 중 {level})
        </span>
      )}
    </strong>
  );

  return (
    <span className={`${styles.condition} ${caption ? styles.conditionStacked : ""}`} data-condition={condition ?? undefined}>
      {caption ? (
        <span className={styles.conditionHead}>
          <span className={styles.conditionCaption}>{caption}</span>
          {word}
        </span>
      ) : (
        word
      )}
      <span className={styles.conditionBars} aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <i key={i} className={i < filled ? styles.conditionOn : undefined} />
        ))}
      </span>
    </span>
  );
}
