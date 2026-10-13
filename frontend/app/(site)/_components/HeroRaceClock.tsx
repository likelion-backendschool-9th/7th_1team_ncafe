"use client";

import RacePhaseBadge from "@/components/RacePhaseBadge";
import Scoreboard from "@/components/Scoreboard";
import { formatCountdownSpoken, formatRaceSlot } from "@/lib/time";
import { useRaceCountdown } from "@/lib/useCountdown";
import styles from "./hero.module.css";

/**
 * 히어로 NEXT RACE 슬라이드의 시계 — "오늘 18:00 [SOON]" + "Race starts in 01:24:32".
 * LIVE(시작 후 10분)에는 카운트다운 대신 "지금 경주 중 · 다음 경주 내일 12:30".
 * 시계를 읽기 전(정적 셸 · 하이드레이션 전)에는 fallback 문구와 "--:--:--" 를 보여 준다.
 * 매초 다시 그려지는 범위를 이 컴포넌트로 한정한다.
 */
export default function HeroRaceClock({ fallback }: { fallback: string }) {
  const { schedule, countdown } = useRaceCountdown();

  if (schedule?.live) {
    return (
      <div className={styles.clock}>
        <p className={styles.clockLine}>
          <RacePhaseBadge phase="LIVE" />
          <strong>NOW RACING {schedule.live.time}</strong>
        </p>
        <p className={styles.clockNote}>지금 트랙에서 경주가 진행 중이에요 · 다음 경주 {formatRaceSlot(schedule.next)}</p>
      </div>
    );
  }

  return (
    <div className={styles.clock}>
      <p className={styles.clockLine}>
        <strong>{schedule ? `${formatRaceSlot(schedule.next)} 출발` : fallback}</strong>
        <RacePhaseBadge phase={schedule?.phase ?? null} />
      </p>
      <p className={styles.clockCount}>
        <span className={styles.clockLabel}>Race starts in</span>
        <Scoreboard
          value={countdown}
          size="md"
          onDark
          label={schedule ? `출발까지 ${formatCountdownSpoken(schedule.remainingMs)}` : "출발까지 남은 시간을 불러오는 중"}
        />
      </p>
    </div>
  );
}

/** 하단 탭 제목 — "NEXT RACE 18:00" · LIVE 면 "LIVE 18:00". 시계를 읽기 전에는 fallback */
export function HeroRaceTabTitle({ fallback }: { fallback: string }) {
  const { schedule } = useRaceCountdown();
  if (!schedule) return <>{fallback}</>;
  return <>{schedule.live ? `LIVE ${schedule.live.time}` : `NEXT RACE ${schedule.next.time}`}</>;
}
