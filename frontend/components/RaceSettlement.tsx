"use client";

import { useEffect } from "react";
import { payoutFor, payoutLabel } from "@/app/(site)/race/_lib/payout";
import { useRaceSession } from "./RaceProvider";
import { useUser } from "./UserProvider";

/** 결과가 확정됐는지 다시 물어보는 간격 */
const POLL_MS = 1000;

/**
 * 레이스 정산 — 서버가 할 일을 루트에서 대신한다(사용자 결정 2026-10-13: 어느 페이지에 있든 경주가 끝나면 정산).
 * 화면은 그리지 않는다. app/layout.tsx 에서 RaceProvider 안쪽에 둔다.
 * 1) 결과 받기: 내가 건 경주가 출발하면 결과가 확정될 때까지 POLL_MS 마다 raceService.getRaceResult 를 물어 RaceProvider 에 기록한다.
 *    /race 에서 끝까지 본 경주는 useRaceRun 이 먼저 기록한다. raceService(시뮬레이션 포함)는 동적 import 라 다른 페이지 번들에 들어가지 않는다.
 * 2) 정산: 결과가 기록된 경주에 걸었고 아직 정산 전이면 순위만큼 쿠폰을 돌려준다(RACE_PAYOUT, 4위 이하 0장).
 *    settleRace 가 경주당 한 번만 true 를 돌려주므로 결과가 두 경로로 들어와도 · 다른 페이지를 오가도 두 번 지급되지 않는다.
 * 결과 모달은 /race 가 띄운다(RaceProvider.resultSeenUpTo). 백엔드가 붙으면 서버가 정산하고, 여기는 결과 · 쿠폰을 다시 불러오는 일만 한다.
 */
export default function RaceSettlement() {
  const { results, recordResult } = useRaceSession();
  const { races, settleRace, earnCoupons } = useUser();

  // 1) 결과 받기 — 출발 전에는 묻지 않는다
  useEffect(() => {
    const waiting = races.filter((r) => r.settledAt === null && !results.some((x) => x.raceNo === r.raceNo));
    if (waiting.length === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      const { getRaceResult } = await import("@/app/(site)/race/_lib/raceService");
      for (const entry of waiting) {
        if (Date.now() < Date.parse(entry.startsAt)) continue;
        // 경주 번호로 묻는다 — 관리자가 시간표를 바꿔 그 경주의 시각이 달라져도 같은 번호의 실제 결과가 온다
        const result = await getRaceResult(entry.raceNo);
        if (cancelled) return;
        if (result) recordResult(result);
      }
      if (!cancelled) timer = setTimeout(check, POLL_MS);
    };

    const firstStart = Math.min(...waiting.map((r) => Date.parse(r.startsAt)));
    timer = setTimeout(check, Math.max(0, firstStart - Date.now()));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [races, results, recordResult]);

  // 2) 정산
  useEffect(() => {
    for (const entry of races) {
      if (entry.settledAt !== null) continue;
      const result = results.find((r) => r.raceNo === entry.raceNo);
      if (!result) continue;
      const rank = result.ranking.indexOf(entry.horseId) + 1;
      if (rank < 1) continue;
      const payout = payoutFor(rank);
      if (settleRace(entry.raceNo, rank, payout) && payout > 0) {
        earnCoupons(payout, "RACE_PAYOUT", payoutLabel(entry.raceNo, rank, payout));
      }
    }
  }, [races, results, settleRace, earnCoupons]);

  return null;
}
