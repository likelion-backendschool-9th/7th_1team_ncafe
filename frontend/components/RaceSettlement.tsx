"use client";

import { useEffect } from "react";
import { useMyBets } from "@/app/(site)/race/_hooks/useRaceData";
import { losingStreakStore, myBetsStore, raceHistoryStore } from "@/app/(site)/race/_lib/raceStores";
import { RACE_SETTLE_MS } from "@/app/(site)/race/_lib/simulation";
import { authStore, useAuth } from "@/lib/auth";
import { raceScheduleStore } from "@/lib/raceSchedule";
import { useNow } from "@/lib/useCountdown";
import { useRaceSchedule } from "@/lib/useRaceSchedule";

/** 정산을 기다리는 동안 서버 결과를 다시 묻는 간격(서버 정산 스케줄러는 2초마다 돈다) */
const POLL_MS = 2000;

/**
 * 레이스 결과 받기 — 정산은 서버가 한다(출발 + 19.5초 뒤 스케줄러가 순위 · 쿠폰을 확정). 여기는 어느 페이지에 있든
 * 결과가 확정될 때를 놓치지 않도록 서버 값을 다시 불러오기만 한다. 화면은 그리지 않는다. app/layout.tsx 에서 RaceProvider 안쪽에 둔다.
 * 1) 결과 확정 시각이 지났는데 아직 정산 전인 경주(오늘 일정)나 내 걸기가 있으면 POLL_MS 마다 일정 · 기록 · 내 걸기 · 쿠폰 수 ·
 *    연패 위로 쿠폰 상태를 다시 불러온다(정산되면 위로 쿠폰 지급 예정 시각이 생긴다 — LosingStreakNotice).
 * 2) 로그인 · 로그아웃하면 내 걸기 · 연패 위로 쿠폰 상태를 다시 불러온다.
 * 결과 모달(정산된 내 경주를 /race 에서 한 번)은 useRace 가 이 값으로 띄운다.
 */
export default function RaceSettlement() {
  const now = useNow();
  const { member } = useAuth();
  const schedule = useRaceSchedule().data;
  const myBets = useMyBets().data;
  const memberNo = member?.no ?? null;

  // 2) 로그인한 회원이 바뀌면 내 걸기를 다시
  useEffect(() => {
    void myBetsStore.refresh();
    void losingStreakStore.refresh();
  }, [memberNo]);

  // 1) 결과 확정을 기다리는 경주가 있으면 서버 값을 다시
  const waiting =
    now !== null &&
    (schedule.some((r) => r.status === "SCHEDULED" && now >= r.startsAt + RACE_SETTLE_MS) ||
      myBets.some((b) => b.settledAt === null && now >= Date.parse(b.startsAt) + RACE_SETTLE_MS));
  useEffect(() => {
    if (!waiting) return;
    const refreshAll = () => {
      void raceScheduleStore.refresh();
      void raceHistoryStore.refresh();
      if (memberNo !== null) {
        void myBetsStore.refresh();
        void authStore.refresh();
        void losingStreakStore.refresh();
      }
    };
    refreshAll();
    const timer = setInterval(refreshAll, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, memberNo]);

  return null;
}
