"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import RacePhaseBadge from "@/components/RacePhaseBadge";
import Scoreboard from "@/components/Scoreboard";
import { formatCountdownSpoken, formatRaceSlot } from "@/lib/time";
import { useRaceCountdown } from "@/lib/useCountdown";
import styles from "./race.module.css";

/**
 * /race 상단 전광판 — 다음 경기 · 남은 시간 · 내 쿠폰 세 칸(BLUEPRINT 8.2 화면 구성 1).
 * LIVE(시작 후 10분)에는 "NOW RACING 18:00" · 다음 경주 시각을 보여 주고 카운트다운은 쉰다.
 * 예정된 경주가 없으면(관리자 일정이 비었거나 다 지남) "예정 없음" · "--:--:--".
 * 내 쿠폰은 로그인 회원의 서버 쿠폰 수다(걸 수 있는지 판단하는 값) — 로그인하지 않았으면 로그인 링크.
 */
export default function RaceCountdown() {
  const { schedule, countdown } = useRaceCountdown();
  const { member, loading } = useAuth();
  const coupons = member?.couponCount ?? 0;
  const live = schedule?.live ?? null;
  const next = schedule?.next ?? null;

  return (
    <section className={styles.board} aria-label="DAILY CAFE RACE 전광판">
      <div className={styles.boardCell}>
        <span className={styles.boardLabel}>{live ? "NOW RACING" : "NEXT RACE"}</span>
        <span className={styles.boardValue}>
          <strong>{live ? live.time : next ? formatRaceSlot(next) : schedule ? "예정 없음" : "--:--"}</strong>
          <RacePhaseBadge phase={schedule?.phase ?? null} />
        </span>
      </div>

      <div className={styles.boardCell}>
        <span className={styles.boardLabel}>{live ? "다음 경주" : "RACE STARTS IN"}</span>
        {live ? (
          <strong className={styles.boardValue}>{next ? formatRaceSlot(next) : "미정"}</strong>
        ) : (
          <Scoreboard
            value={countdown}
            size="md"
            label={
              next && schedule?.remainingMs != null
                ? `출발까지 ${formatCountdownSpoken(schedule.remainingMs)}`
                : schedule
                  ? "예정된 경주가 없어요"
                  : "출발까지 남은 시간을 불러오는 중"
            }
          />
        )}
      </div>

      <div className={styles.boardCell}>
        <span className={styles.boardLabel}>MY COUPONS</span>
        {!loading && !member ? (
          <Link href="/login?next=/race" className={styles.boardValue}>
            <strong>로그인</strong>
          </Link>
        ) : (
          <span className={styles.boardValue}>
            <Scoreboard
              value={member ? String(coupons).padStart(2, "0") : "--"}
              size="md"
              label={member ? `내 쿠폰 ${coupons}장` : "내 쿠폰을 불러오는 중"}
            />
            <span className={styles.boardUnit} aria-hidden>
              장
            </span>
          </span>
        )}
      </div>
    </section>
  );
}
