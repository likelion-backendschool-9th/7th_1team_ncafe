"use client";

import { formatRaceTimes } from "@/lib/time";
import { useRaceTimes } from "@/lib/useRaceTimes";

/** 지금 공지된 경주 시각 "12:30 · 18:00" — 관리자가 시간표를 바꾸면 따라간다(서버 컴포넌트 Footer 안의 작은 클라이언트 조각) */
export default function RaceTimesText() {
  return <>{formatRaceTimes(useRaceTimes())}</>;
}
