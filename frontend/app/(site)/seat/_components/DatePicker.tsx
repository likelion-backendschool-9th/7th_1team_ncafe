"use client";

import { useId, useState } from "react";
import { dayOfWeek, formatYmdSpoken, WEEKDAY_KO, ymdParts } from "@/lib/kst";
import { monthCells, shiftMonth } from "../_lib/schedule";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import styles from "./seat.module.css";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  today: string;
  min: string;
  max: string;
  onChange: (ymd: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 달력 —한 달씩 넘기고, 일요일은 빨강, 오늘은 "오늘" 표시, 예약 범위 밖은 흐리게.
 * 고른 날은 짙은 원. 달은 예약 범위가 걸친 달 사이에서만 넘어간다. 이미 고른 날을 다시 눌러도 onChange 하지 않는다(시간대 · 의자가 풀리지 않게).
 */
export default function DatePicker({ value, today, min, max, onChange }: DatePickerProps) {
  const titleId = useId();
  const [view, setView] = useState(() => {
    const { year, month } = ymdParts(value);
    return { year, month };
  });
  const minMonth = ymdParts(min);
  const maxMonth = ymdParts(max);
  const monthIndex = view.year * 12 + view.month;
  const canPrev = monthIndex > minMonth.year * 12 + minMonth.month;
  const canNext = monthIndex < maxMonth.year * 12 + maxMonth.month;
  const cells = monthCells(view.year, view.month);

  return (
    <div className={styles.cal} role="group" aria-labelledby={titleId}>
      <div className={styles.calHead}>
        <button type="button" className={styles.calNav} aria-label="이전 달" disabled={!canPrev} onClick={() => setView(shiftMonth(view.year, view.month, -1))}>
          <ChevronLeftIcon />
        </button>
        <span id={titleId} className={styles.calMonth}>
          {view.year}.{pad(view.month)}
        </span>
        <button type="button" className={styles.calNav} aria-label="다음 달" disabled={!canNext} onClick={() => setView(shiftMonth(view.year, view.month, 1))}>
          <ChevronRightIcon />
        </button>
      </div>

      <div className={styles.calGrid}>
        {WEEKDAY_KO.map((day, i) => (
          <span key={day} className={`${styles.calWeekday} ${i === 0 ? styles.calSun : ""}`} aria-hidden>
            {day}
          </span>
        ))}
        {cells.map((ymd, i) =>
          ymd === null ? (
            <span key={`empty-${i}`} className={styles.calEmpty} aria-hidden />
          ) : (
            <button
              key={ymd}
              type="button"
              className={`${styles.calDay} ${dayOfWeek(ymd) === 0 ? styles.calSun : ""}`}
              disabled={ymd < min || ymd > max}
              aria-pressed={ymd === value}
              aria-current={ymd === today ? "date" : undefined}
              aria-label={`${formatYmdSpoken(ymd)}${ymd === today ? " 오늘" : ""}`}
              onClick={() => ymd !== value && onChange(ymd)}
            >
              {ymdParts(ymd).day}
              {ymd === today && (
                <span className={styles.calToday} aria-hidden>
                  오늘
                </span>
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
