"use client";

import { formatYmdKo } from "@/lib/kst";
import type { SeatBooking } from "../_hooks/useSeatBooking";
import { formatBlock } from "../_lib/schedule";
import { PinIcon } from "./icons";
import styles from "./seat.module.css";
import SeatSummary from "./SeatSummary";

interface BookingBarProps {
  booking: SeatBooking;
  total: number;
}

/** 위쪽 일정 바 —고른 지점 · 날짜 · 시간대 · 인원 칩 + [일정변경] | 좌석 현황 요약 */
export default function BookingBar({ booking, total }: BookingBarProps) {
  const { branch, date, block, people, step, backToSchedule, restart, summary, updatedAt } = booking;

  return (
    <div className={styles.bar}>
      <div className={styles.barSchedule} aria-label="선택한 일정">
        <span className={`${styles.chip} ${styles.chipBranch}`}>
          <PinIcon />
          {branch?.name ?? "지점"}
        </span>
        <span className={`${styles.chip} ${date ? "" : styles.chipEmpty}`}>{date ? formatYmdKo(date) : "날짜"}</span>
        <span className={`${styles.chip} ${block ? "" : styles.chipEmpty}`}>{block ? formatBlock(block) : "시간대"}</span>
        <span className={`${styles.chip} ${people ? "" : styles.chipEmpty}`}>{people ? `${people}명` : "인원"}</span>
        {step !== "SCHEDULE" && (
          <button type="button" className={`btn btn-outline btn-sm ${styles.barChange}`} onClick={step === "DONE" ? restart : backToSchedule}>
            일정변경
          </button>
        )}
      </div>
      <SeatSummary summary={summary} updatedAt={updatedAt} total={total} />
    </div>
  );
}
