"use client";

import { raceGates } from "@/app/(site)/race/_lib/records";
import type { Horse, ServerRace } from "@/app/(site)/race/_types";
import { kstDate } from "@/lib/kst";
import { formatCountdown, formatRaceDate, formatRaceDayText, formatRaceSlot, getRaceSchedule } from "@/lib/time";
import { racesOn, TIMETABLE_STATE_LABEL, timetableRow, type TimetableRow } from "../_lib/timetable";
import HorseTag from "./HorseTag";
import styles from "./raceAdmin.module.css";

interface RaceStatusPanelProps {
  now: number | null;
  loaded: boolean; // 관리자 경주 목록을 받았는가
  races: ServerRace[]; // 서버의 모든 경주, 최신순
  horses: Horse[];
}

/**
 * 경주 현황 — 다음 경주 · 지금(LIVE) · 최근 결과 · 오늘 경주 수 카드. 날짜별 경주표는 아래 일정 달력(RaceCalendar).
 * 번호 · 결과 · 게이트는 서버 경주 값이고, 다음 · LIVE 는 손님 화면과 같은 일정 계산(lib/time)으로 고른다. 시계를 읽기 전 · 목록을 받기 전에는 빈 카드.
 */
export default function RaceStatusPanel({ now, loaded, races, horses }: RaceStatusPanelProps) {
  if (now === null || !loaded) {
    return (
      <div className={styles.cards} aria-busy="true">
        <span className="visually-hidden">경주 현황을 불러오는 중</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${styles.card} ${styles.cardPlaceholder}`} aria-hidden />
        ))}
      </div>
    );
  }

  const schedule = getRaceSchedule(now);
  const rowAt = (at: number) => {
    const race = races.find((r) => r.startsAt === at);
    return race ? timetableRow(race, now) : null;
  };
  const nextRow = schedule.next ? rowAt(schedule.next.at) : null;
  const liveRow = schedule.live ? rowAt(schedule.live.at) : null;
  const last = races.map((race) => timetableRow(race, now)).find((row) => row.result !== null) ?? null;
  const today = racesOn(kstDate(now), races).map((race) => timetableRow(race, now));
  const horseOf = (id: number) => horses.find((h) => h.id === id);

  return (
    <div className={styles.cards}>
      <div className={styles.card}>
        <span className={styles.cardLabel}>NEXT RACE · 다음 경주</span>
        {schedule.next && nextRow ? (
          <>
            <strong className={styles.cardValue}>Race #{nextRow.raceNo}</strong>
            <span className={styles.cardSub}>{formatRaceSlot(schedule.next)} 출발</span>
            <span className={styles.cardMuted}>
              출발까지 <span className="font-board">{formatCountdown(schedule.next.at - now)}</span>
              {nextRow.state !== "UPCOMING" && <> · {TIMETABLE_STATE_LABEL[nextRow.state]}</>}
            </span>
          </>
        ) : (
          <>
            <strong className={styles.cardValue}>없음</strong>
            <span className={styles.cardMuted}>아래 달력에서 날짜를 골라 경주를 추가하면 여기에 보여요.</span>
          </>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardLabel}>LIVE · 지금</span>
        {schedule.live && liveRow ? (
          <>
            <strong className={styles.cardValue}>Race #{liveRow.raceNo}</strong>
            <span className={styles.cardSub}>
              <StateChip row={liveRow} /> {schedule.live.time} 출발
            </span>
            {liveRow.result && (
              <span className={styles.cardMuted}>
                1위{" "}
                <HorseTag
                  horse={horseOf(liveRow.result.ranking[0])}
                  gate={raceGates(liveRow.race, horses)[liveRow.result.ranking[0]]}
                  id={liveRow.result.ranking[0]}
                />
              </span>
            )}
          </>
        ) : (
          <>
            <strong className={styles.cardValue}>없음</strong>
            <span className={styles.cardMuted}>경주가 출발하면 10분 동안 여기에 보여요.</span>
          </>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardLabel}>LAST RESULT · 최근 결과</span>
        {last?.result ? (
          <>
            <strong className={styles.cardValue}>Race #{last.raceNo}</strong>
            <span className={styles.cardSub}>
              1위{" "}
              <HorseTag
                horse={horseOf(last.result.ranking[0])}
                gate={raceGates(last.race, horses)[last.result.ranking[0]]}
                id={last.result.ranking[0]}
              />
            </span>
            <span className={styles.cardMuted}>{formatRaceDate(last.result.date)} 출발</span>
          </>
        ) : (
          <strong className={styles.cardValue}>–</strong>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardLabel}>TODAY · 오늘 경주</span>
        <strong className={styles.cardValue}>{today.length}경주</strong>
        <span className={styles.cardSub}>
          종료 {today.filter((r) => r.state === "FINISHED").length} · 남음 {today.filter((r) => r.state !== "FINISHED").length}
        </span>
        <span className={styles.cardMuted}>손님 화면 문구: {formatRaceDayText(now)}</span>
      </div>
    </div>
  );
}

function StateChip({ row }: { row: TimetableRow }) {
  return <span className={`${styles.state} ${styles[`state_${row.state}`]}`}>{TIMETABLE_STATE_LABEL[row.state]}</span>;
}
