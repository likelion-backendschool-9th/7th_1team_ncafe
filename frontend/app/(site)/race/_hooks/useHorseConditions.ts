"use client";

import { useEffect, useState } from "react";
import { useKstToday } from "@/lib/useCountdown";
import { getHorseConditions } from "../_lib/raceService";
import type { HorseCondition } from "../_types";

type ConditionMap = Readonly<Record<number, HorseCondition>>;

/**
 * 오늘(KST)의 컨디션 — 말 id → 컨디션. 날짜를 알기 전(정적 셸 · 하이드레이션)과 받아 오기 전에는 null.
 * 자정이 지나면 새 날짜로 다시 받는다. /race 출전표와 메인 "TODAY'S RUNNERS" 가 함께 쓴다.
 */
export function useHorseConditions(): ConditionMap | null {
  const today = useKstToday();
  const [snapshot, setSnapshot] = useState<{ date: string; map: ConditionMap } | null>(null);

  useEffect(() => {
    if (today === null) return;
    let alive = true;
    getHorseConditions(today).then((map) => {
      if (alive) setSnapshot({ date: today, map });
    });
    return () => {
      alive = false;
    };
  }, [today]);

  return snapshot && snapshot.date === today ? snapshot.map : null;
}
