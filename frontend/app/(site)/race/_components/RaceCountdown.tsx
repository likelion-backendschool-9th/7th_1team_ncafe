"use client";

import RacePhaseBadge from "@/components/RacePhaseBadge";
import Scoreboard from "@/components/Scoreboard";
import { useUser } from "@/components/UserProvider";
import { formatCountdownSpoken, formatRaceSlot, formatRaceTimes } from "@/lib/time";
import { useRaceCountdown } from "@/lib/useCountdown";
import styles from "./race.module.css";

/**
 * /race 상단 전광판 — 다음 경기 · 남은 시간 · 내 쿠폰 세 칸(BLUEPRINT 8.2 화면 구성 1).
 * LIVE(시작 후 10분)에는 "NOW RACING 18:00" · 다음 경주 시각을 보여 주고 카운트다운은 쉰다.
 * 프로토타입이라 실제 경주는 시각과 상관없이 출전표에서 바로 시작할 수 있다 — 이 전광판은 실제 일정만 알려 준다.
 * 7단계에서 /race 페이지(출전표) 위에 붙인다.
 */
export default function RaceCountdown() {
  const { schedule, countdown } = useRaceCountdown();
  const { coupons } = useUser();
  const live = schedule?.live ?? null;

  return (
    <section className={styles.board} aria-label="DAILY CAFE RACE 전광판">
      <div className={styles.boardCell}>
        <span className={styles.boardLabel}>{live ? "NOW RACING" : "NEXT RACE"}</span>
        <span className={styles.boardValue}>
          <strong>{live ? live.time : schedule ? formatRaceSlot(schedule.next) : formatRaceTimes()}</strong>
          <RacePhaseBadge phase={schedule?.phase ?? null} />
        </span>
      </div>

      <div className={styles.boardCell}>
        <span className={styles.boardLabel}>{live ? "다음 경주" : "RACE STARTS IN"}</span>
        {live && schedule ? (
          <strong className={styles.boardValue}>{formatRaceSlot(schedule.next)}</strong>
        ) : (
          <Scoreboard
            value={countdown}
            size="md"
            label={schedule ? `출발까지 ${formatCountdownSpoken(schedule.remainingMs)}` : "출발까지 남은 시간을 불러오는 중"}
          />
        )}
      </div>

      <div className={styles.boardCell}>
        <span className={styles.boardLabel}>MY COUPONS</span>
        <span className={styles.boardValue}>
          <Scoreboard value={String(coupons).padStart(2, "0")} size="md" label={`내 쿠폰 ${coupons}장`} />
          <span className={styles.boardUnit} aria-hidden>
            장
          </span>
        </span>
      </div>
    </section>
  );
}
