"use client";

import Scoreboard from "@/components/Scoreboard";
import type { SeatSummaryData } from "../_lib/summary";
import styles from "./seat.module.css";

interface SeatSummaryProps {
  summary: SeatSummaryData | null; // 시간대를 고르기 전엔 null
  updatedAt: number | null; // epoch ms
  total: number; // 전체 의자 수(시간대 전)
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 좌석 현황 요약(지시서 16절) — AVAILABLE SEATS 전광판 + 빈 테이블 인원별 수 + 마지막 업데이트 */
export default function SeatSummary({ summary, updatedAt, total }: SeatSummaryProps) {
  const value = summary ? `${summary.available}/${summary.total}` : `--/${total}`;
  const updated = updatedAt === null ? "--:--" : `${pad(new Date(updatedAt).getHours())}:${pad(new Date(updatedAt).getMinutes())}`;

  return (
    <div className={styles.summary} aria-live="polite">
      <div className={styles.summaryMain}>
        <span className={styles.summaryLabel}>AVAILABLE SEATS</span>
        <Scoreboard
          value={value}
          size="sm"
          label={summary ? `이용 가능 ${summary.available}석, 전체 ${summary.total}석` : "시간대를 고르면 좌석 현황이 보여요"}
        />
      </div>
      <div className={styles.summaryMeta}>
        {summary ? (
          <>
            <span>
              빈 테이블 {summary.emptyTables.map((t) => `${t.capacity}인석 ${t.count}`).join(" · ")} · 바 {summary.emptyStools}
            </span>
            <span>마지막 업데이트 {updated}</span>
          </>
        ) : (
          <span>시간대를 고르면 좌석 현황이 보여요</span>
        )}
      </div>
    </div>
  );
}
