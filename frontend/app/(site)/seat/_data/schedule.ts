import type { TimeBlock } from "../_types";

/** 예약 시간대 — 1시간 블록 13개(사용자 결정 2026-10-13, 2시간 6개에서 변경). 영업 09:00–22:00(Footer) 전부. */
export const TIME_BLOCKS: TimeBlock[] = Array.from({ length: 13 }, (_, i) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return { start: `${pad(9 + i)}:00`, end: `${pad(10 + i)}:00` };
});

/** 오늘부터 예약할 수 있는 날 수(오늘 포함) */
export const BOOKING_DAYS = 14;

/** 한 번에 예약할 수 있는 최대 인원(= 의자 수) */
export const MAX_PEOPLE = 8;
