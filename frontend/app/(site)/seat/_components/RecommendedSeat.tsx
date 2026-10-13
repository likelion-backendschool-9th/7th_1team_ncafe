"use client";

import type { Recommendation, RecommendResult } from "../_lib/recommend";
import styles from "./seat.module.css";

export type RecommendState = "NO_SLOT" | "NO_PEOPLE" | "READY";

interface RecommendedSeatProps {
  state: RecommendState;
  result: RecommendResult;
  onPick: (chairIds: string[]) => void;
}

/**
 * 추천 좌석(지시서 20절) — 필터 줄 아래 RECOMMENDED 카드 최대 3개. 누르면 그 의자들이 선택되고 선택 좌석 단계로 넘어간다.
 * 시간대 전 · 인원 전에는 안내, 조건에 맞는 자리가 없으면 안내 + 특징 조건을 뺀 대안 1개.
 */
export default function RecommendedSeat({ state, result, onPick }: RecommendedSeatProps) {
  return (
    <div className={styles.recoRow}>
      <span className={styles.toolLabel}>RECOMMENDED</span>
      {state === "NO_SLOT" ? (
        <p className={styles.recoNote}>시간대를 고르면 맞춤 좌석을 추천해 드려요.</p>
      ) : state === "NO_PEOPLE" ? (
        <p className={styles.recoNote}>인원을 선택하면 맞춤 좌석을 추천해 드려요.</p>
      ) : result.picks.length === 0 ? (
        <>
          <p className={styles.recoNote}>조건에 맞는 빈 좌석이 없어요. 조건을 줄여 보세요.</p>
          {result.fallback && (
            <ul className={styles.recoList}>
              <li>
                <RecoCard pick={result.fallback} alternative onPick={onPick} />
              </li>
            </ul>
          )}
        </>
      ) : (
        <ul className={styles.recoList} aria-label="추천 좌석">
          {result.picks.map((pick, i) => (
            <li key={pick.key}>
              <RecoCard pick={pick} rank={i + 1} onPick={onPick} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecoCard({ pick, rank, alternative = false, onPick }: { pick: Recommendation; rank?: number; alternative?: boolean; onPick: (ids: string[]) => void }) {
  const reasons = pick.reasons.join(" · ");
  return (
    <button
      type="button"
      className={`${styles.recoCard} ${alternative ? styles.recoCardAlt : ""}`}
      aria-label={`${alternative ? "대안" : `추천 ${rank}`}: ${pick.label}, ${reasons}, ${pick.detail}`}
      onClick={() => onPick(pick.chairIds)}
    >
      <span className={styles.recoStar} aria-hidden>
        {alternative ? "≈" : "★"}
      </span>
      <span className={styles.recoBody}>
        <span className={styles.recoId}>{pick.label}</span>
        <span className={styles.recoText}>
          {reasons}
          <small>{alternative ? `대안 · ${pick.detail}` : pick.detail}</small>
        </span>
      </span>
    </button>
  );
}
