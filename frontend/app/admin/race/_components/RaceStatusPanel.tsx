"use client";

import { gatesFor } from "@/app/(site)/race/_lib/records";
import type { Horse, RaceResult } from "@/app/(site)/race/_types";
import { formatKstTime } from "@/lib/kst";
import { formatCountdown, formatRaceDate, formatRaceSlot, formatRaceTimes, getRaceSchedule } from "@/lib/time";
import { useRaceTimes } from "@/lib/useRaceTimes";
import adminStyles from "../../_components/admin.module.css";
import { buildTimetable, TIMETABLE_STATE_LABEL, type TimetableRow } from "../_lib/timetable";
import HorseTag from "./HorseTag";
import styles from "./raceAdmin.module.css";

interface RaceStatusPanelProps {
  now: number | null;
  history: RaceResult[];
  horses: Horse[];
}

/**
 * 경주 현황 — 다음 경주 · 지금(LIVE) · 최근 결과 · 오늘 경주 수 카드 + 오늘 · 내일 경주표.
 * 번호 · 결과는 /race 와 같은 기록(useRaceHistory)에서 계산한다. 시계를 읽기 전에는 빈 카드.
 */
export default function RaceStatusPanel({ now, history, horses }: RaceStatusPanelProps) {
  const raceTimes = useRaceTimes();

  if (now === null) {
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
  const rows = buildTimetable(now, history);
  const nextRow = rows.find((r) => r.at === schedule.next.at);
  const liveRow = schedule.live ? rows.find((r) => r.at === schedule.live!.at) : undefined;
  const last = history[0] ?? null;
  const today = rows.filter((r) => r.day === "TODAY");
  const horseOf = (id: number) => horses.find((h) => h.id === id);

  return (
    <>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>NEXT RACE · 다음 경주</span>
          <strong className={styles.cardValue}>Race #{nextRow?.raceNo ?? "–"}</strong>
          <span className={styles.cardSub}>{formatRaceSlot(schedule.next)} 출발</span>
          <span className={styles.cardMuted}>
            출발까지 <span className="font-board">{formatCountdown(schedule.remainingMs)}</span>
            {nextRow && nextRow.state !== "UPCOMING" && <> · {TIMETABLE_STATE_LABEL[nextRow.state]}</>}
          </span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>LIVE · 지금</span>
          {liveRow ? (
            <>
              <strong className={styles.cardValue}>Race #{liveRow.raceNo}</strong>
              <span className={styles.cardSub}>
                <StateChip row={liveRow} /> {schedule.live!.time} 출발
              </span>
              {liveRow.result && (
                <span className={styles.cardMuted}>
                  1위{" "}
                  <HorseTag
                    horse={horseOf(liveRow.result.ranking[0])}
                    gate={gatesFor(liveRow.raceNo, history, horses)[liveRow.result.ranking[0]]}
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
          {last ? (
            <>
              <strong className={styles.cardValue}>Race #{last.raceNo}</strong>
              <span className={styles.cardSub}>
                1위{" "}
                <HorseTag
                  horse={horseOf(last.ranking[0])}
                  gate={gatesFor(last.raceNo, history, horses)[last.ranking[0]]}
                  id={last.ranking[0]}
                />
              </span>
              <span className={styles.cardMuted}>{formatRaceDate(last.date)} 출발</span>
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
          <span className={styles.cardMuted}>시간표 매일 {formatRaceTimes(raceTimes)}</span>
        </div>
      </div>

      <h3 className={styles.subTitle}>오늘 · 내일 경주표</h3>
      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">출발</th>
            <th scope="col">경주</th>
            <th scope="col">상태</th>
            <th scope="col">결과 (1~3위)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gates = row.result ? gatesFor(row.raceNo, history, horses) : null;
            return (
              <tr key={row.at} className={row === nextRow ? styles.rowNext : undefined}>
                <td data-label="날짜">{row.day === "TODAY" ? "오늘" : "내일"}</td>
                <td data-label="출발" className="font-board">
                  {formatKstTime(row.at)}
                </td>
                <td data-label="경주" className="font-board">
                  Race #{row.raceNo}
                  {row === nextRow && <span className="visually-hidden"> (다음 경주)</span>}
                </td>
                <td data-label="상태">
                  <StateChip row={row} />
                </td>
                <td data-label="결과">
                  {row.result && gates ? (
                    <span className={styles.podium}>
                      {row.result.ranking.slice(0, 3).map((id, i) => (
                        <span key={id}>
                          {i + 1}위 <HorseTag horse={horseOf(id)} gate={gates[id]} id={id} />
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className={adminStyles.dash}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function StateChip({ row }: { row: TimetableRow }) {
  return <span className={`${styles.state} ${styles[`state_${row.state}`]}`}>{TIMETABLE_STATE_LABEL[row.state]}</span>;
}
