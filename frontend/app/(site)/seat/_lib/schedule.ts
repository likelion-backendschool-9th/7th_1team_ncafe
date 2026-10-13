// 예약 일정 순수 함수 — 예약 가능 기간 · 시간대 상태 · 달력 칸. 시각은 KST(lib/kst.ts).
import { addDays, dayOfWeek, kstDate, kstMinutes, minutesOf } from "@/lib/kst";
import { BOOKING_DAYS } from "../_data/schedule";
import type { BlockState, SeatSlot, TimeBlock } from "../_types";

/** 오늘부터 BOOKING_DAYS 일 — 달력에서 고를 수 있는 범위 */
export function bookingRange(now: number): { from: string; to: string } {
  const from = kstDate(now);
  return { from, to: addDays(from, BOOKING_DAYS - 1) };
}

/** 지나간 시간대는 CLOSED, 오늘 지금 진행 중이면 LIVE, 나머지는 OPEN */
export function blockState(date: string, block: TimeBlock, now: number): BlockState {
  const today = kstDate(now);
  if (date < today) return "CLOSED";
  if (date > today) return "OPEN";
  const minute = kstMinutes(now);
  if (minute >= minutesOf(block.end)) return "CLOSED";
  if (minute >= minutesOf(block.start)) return "LIVE";
  return "OPEN";
}

/** "13:00~14:00" */
export function formatBlock(block: TimeBlock): string {
  return `${block.start}~${block.end}`;
}

/** 그 날에 아직 예약할 수 있는(지나지 않은) 시간대가 있는지 — 오늘 다 지났으면 기본 날짜를 내일로 */
export function hasOpenBlock(date: string, blocks: TimeBlock[], now: number): boolean {
  return blocks.some((b) => blockState(date, b, now) !== "CLOSED");
}

/** 시간대 카드 범위 필터(전체 · 오전 · 오후 · 18시 이후) — 1시간 블록 13개를 줄여 보는 용도 */
export type TimeFilterId = "ALL" | "MORNING" | "AFTERNOON" | "EVENING";
export const TIME_FILTERS: { id: TimeFilterId; label: string; fromHour: number; toHour: number }[] = [
  { id: "ALL", label: "전체", fromHour: 0, toHour: 24 },
  { id: "MORNING", label: "오전", fromHour: 0, toHour: 12 },
  { id: "AFTERNOON", label: "오후", fromHour: 12, toHour: 18 },
  { id: "EVENING", label: "저녁", fromHour: 18, toHour: 24 },
];

export function matchesTimeFilter(block: TimeBlock, id: TimeFilterId): boolean {
  const filter = TIME_FILTERS.find((f) => f.id === id) ?? TIME_FILTERS[0];
  const hour = minutesOf(block.start) / 60;
  return hour >= filter.fromHour && hour < filter.toHour;
}

export function isWeekend(date: string): boolean {
  const d = dayOfWeek(date);
  return d === 0 || d === 6;
}

/** 예약 · 예약대기가 같은 지점 · 날짜 · 시간대인지 */
export function sameSlot(a: { branchId: string; date: string; start: string }, slot: SeatSlot): boolean {
  return a.branchId === slot.branchId && a.date === slot.date && a.start === slot.start;
}

/** 시간대가 끝난 뒤인지(예약 내역의 "이용 완료" 판정) */
export function isPastSlot(date: string, end: string, now: number): boolean {
  const today = kstDate(now);
  if (date < today) return true;
  if (date > today) return false;
  return kstMinutes(now) >= minutesOf(end);
}

/**
 * 달력 한 달의 칸 — 일요일 시작, 1일 앞의 빈 칸은 null. 길이는 7의 배수.
 */
export function monthCells(year: number, month: number): (string | null)[] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = dayOfWeek(first);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
