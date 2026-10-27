"use client";

import { useRaceDayText } from "@/lib/useCountdown";

/**
 * 경주 일정 문구 "오늘 12:30 · 18:00" · "다음 경주 10/29(목) 18:00" · "예정된 경주 없음" — 관리자가 경주를 추가 · 삭제하면 따라간다
 * (서버 컴포넌트 Footer 안의 작은 클라이언트 조각). 시계를 읽기 전에는 "경주 일정".
 */
export default function RaceTimesText() {
  return <>{useRaceDayText() ?? "경주 일정"}</>;
}
