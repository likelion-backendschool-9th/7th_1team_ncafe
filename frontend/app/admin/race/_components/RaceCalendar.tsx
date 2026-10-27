"use client";

import { useId, type SubmitEvent } from "react";
import { raceGates } from "@/app/(site)/race/_lib/records";
import type { Horse, ServerRace } from "@/app/(site)/race/_types";
import { formatKstTime, formatMdKo, formatYmdSpoken, kstDate, WEEKDAY_KO, ymdParts } from "@/lib/kst";
import adminStyles from "../../_components/admin.module.css";
import type { ToastMessage } from "../../_components/AdminToast";
import ConfirmDialog from "../../_components/ConfirmDialog";
import { useRaceCalendar } from "../_hooks/useRaceCalendar";
import { monthCells, raceCountByDate, racesOn, TIMETABLE_STATE_LABEL, timetableRow, type TimetableRow } from "../_lib/timetable";
import { deleteBlockReason, SCHEDULE_RULES } from "../_lib/validateSchedule";
import HorseTag from "./HorseTag";
import styles from "./raceAdmin.module.css";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

interface RaceCalendarProps {
  now: number | null;
  loaded: boolean; // 관리자 경주 목록을 받았는가
  races: ServerRace[]; // 서버의 모든 경주(GET /api/v1/admin/races)
  horses: Horse[];
  show: Show;
}

/**
 * 경주 일정 달력(사용자 결정 2026-10-27) — 왼쪽 월 달력(경주가 있는 날에 경주 수)에서 날짜를 고르면 오른쪽에 그날의 경주표.
 * 오늘 이후 날짜에는 출발 시각을 골라 경주를 추가하고, 출발 1분 전까지 쿠폰이 걸리지 않은 경주는 삭제할 수 있다.
 * 매일 열리는 시간표가 아니라 경주마다 날짜 · 시각을 정한다. 시계를 읽기 전 · 목록을 받기 전에는 빈 자리.
 */
export default function RaceCalendar({ now, loaded, ...rest }: RaceCalendarProps) {
  if (now === null || !loaded) {
    return (
      <div className={styles.planner} aria-busy="true">
        <span className="visually-hidden">경주 일정을 불러오는 중</span>
        <div className={`${styles.calendar} ${styles.cardPlaceholder}`} aria-hidden />
        <div className={`${styles.dayPanel} ${styles.cardPlaceholder}`} aria-hidden />
      </div>
    );
  }
  return <Planner now={now} {...rest} />;
}

function Planner({ now, races, horses, show }: Omit<RaceCalendarProps, "loaded"> & { now: number }) {
  const today = kstDate(now);
  const c = useRaceCalendar(today, races, show);
  const uid = useId();
  const titleId = `${uid}-title`;
  const errorId = `${uid}-error`;

  const counts = raceCountByDate(races);
  const rows = racesOn(c.date, races).map((race) => timetableRow(race, now));
  const nextAt = c.starts.find((s) => s > now) ?? null;
  const past = c.date < today;
  const { year, month } = ymdParts(`${c.month}-01`);
  const horseOf = (id: number) => horses.find((h) => h.id === id);
  const deletingRace = c.deleting === null ? null : (races.find((r) => r.startsAt === c.deleting) ?? null);
  const deletingRow = deletingRace ? timetableRow(deletingRace, now) : null;

  function handleAdd(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    c.add();
  }

  return (
    <div className={styles.planner}>
      <div className={styles.calendar}>
        <div className={styles.calHead}>
          <button type="button" className={adminStyles.iconBtn} onClick={() => c.moveMonth(-1)} aria-label="이전 달">
            ‹
          </button>
          <strong className={styles.calMonth} aria-live="polite">
            {year}년 {month}월
          </strong>
          <button type="button" className={adminStyles.iconBtn} onClick={() => c.moveMonth(1)} aria-label="다음 달">
            ›
          </button>
          <button type="button" className={`btn btn-outline btn-sm ${styles.calToday}`} onClick={c.goToday}>
            오늘
          </button>
        </div>

        <div className={styles.calWeek} aria-hidden>
          {WEEKDAY_KO.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <ol className={styles.calGrid} aria-label={`${year}년 ${month}월`}>
          {monthCells(c.month).map((date, i) => {
            if (date === null) return <li key={`blank-${i}`} aria-hidden />;
            const count = counts.get(date) ?? 0;
            const isToday = date === today;
            const classes = [styles.calDay, date < today && styles.calDayPast, isToday && styles.calDayToday].filter(Boolean).join(" ");
            return (
              <li key={date}>
                <button
                  type="button"
                  className={classes}
                  aria-pressed={date === c.date}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${formatYmdSpoken(date)}${isToday ? "(오늘)" : ""}, ${count ? `경주 ${count}개` : "경주 없음"}`}
                  onClick={() => c.pick(date)}
                >
                  {ymdParts(date).day}
                  {count > 0 && <span className={styles.calCount}>{count}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <p className={styles.calLegend}>숫자 배지 = 그날의 경주 수</p>
      </div>

      <section className={styles.dayPanel} aria-labelledby={titleId}>
        <h3 id={titleId} className={styles.subTitle}>
          {formatMdKo(c.date)} 경주{c.date === today && " · 오늘"}
          <span className={styles.dayCount}>{rows.length ? `${rows.length}경주` : "없음"}</span>
        </h3>

        {rows.length === 0 ? (
          <p className={styles.diff}>{past ? "이 날은 열린 경주가 없어요." : "아직 경주가 없어요. 아래에서 출발 시각을 골라 추가해 주세요."}</p>
        ) : (
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th scope="col">출발</th>
                <th scope="col">경주</th>
                <th scope="col">상태</th>
                <th scope="col">결과 (1~3위)</th>
                <th scope="col">
                  <span className="visually-hidden">관리</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.at} className={row.at === nextAt ? styles.rowNext : undefined}>
                  <td data-label="출발" className="font-board">
                    {formatKstTime(row.at)}
                  </td>
                  <td data-label="경주" className="font-board">
                    Race #{row.raceNo}
                    {row.at === nextAt && <span className="visually-hidden"> (다음 경주)</span>}
                  </td>
                  <td data-label="상태">
                    <StateChip row={row} />
                  </td>
                  <td data-label="결과">
                    <Podium row={row} horses={horses} horseOf={horseOf} />
                  </td>
                  <td className={adminStyles.cellActions}>
                    <RowAction row={row} now={now} onDelete={() => c.askDelete(row.at)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {past ? (
          <p className={styles.diff}>지난 날짜에는 경주를 추가할 수 없어요.</p>
        ) : (
          <form className={styles.addRow} onSubmit={handleAdd}>
            <label className={adminStyles.field}>
              <span className={adminStyles.label}>{formatMdKo(c.date)} 출발 시각</span>
              <input
                type="time"
                step={60}
                className={`${adminStyles.input} ${styles.timeInput}`}
                value={c.time}
                onChange={(e) => c.changeTime(e.target.value)}
                aria-invalid={c.error ? true : undefined}
                aria-describedby={c.error ? errorId : undefined}
              />
            </label>
            <button type="submit" className="btn btn-outline" disabled={c.busy}>
              + 경주 추가
            </button>
          </form>
        )}

        {c.error && (
          <p id={errorId} className={adminStyles.error} role="alert">
            {c.error}
          </p>
        )}

        <div className={styles.rules}>
          <span>
            지금부터 {SCHEDULE_RULES.leadMinutes}분 이내이거나 지난 시각에는 추가할 수 없어요 · 경주 사이 {SCHEDULE_RULES.minGapMinutes}분 이상
          </span>
          <span>출발 {SCHEDULE_RULES.leadMinutes}분 전까지 삭제할 수 있어요. 쿠폰이 걸린 경주는 삭제하거나 그 앞에 경주를 넣을 수 없어요.</span>
        </div>
      </section>

      <ConfirmDialog
        open={deletingRow !== null}
        title="경주 삭제"
        message={
          deletingRow && (
            <>
              <strong>
                Race #{deletingRow.raceNo} · {formatMdKo(kstDate(deletingRow.at))} {formatKstTime(deletingRow.at)}
              </strong>{" "}
              경주를 삭제할까요?
              <br />
              손님 화면의 일정에서 바로 빠지고, 뒤에 있는 경주 번호가 하나씩 당겨져요.
            </>
          )
        }
        confirmLabel="삭제"
        busy={c.busy}
        onConfirm={c.confirmDelete}
        onCancel={c.cancelDelete}
      />
    </div>
  );
}

function StateChip({ row }: { row: TimetableRow }) {
  return <span className={`${styles.state} ${styles[`state_${row.state}`]}`}>{TIMETABLE_STATE_LABEL[row.state]}</span>;
}

/** 끝난 경주의 1~3위(그 경주 당시 게이트 번호), 아니면 — */
function Podium({ row, horses, horseOf }: { row: TimetableRow; horses: Horse[]; horseOf: (id: number) => Horse | undefined }) {
  if (!row.result) return <span className={adminStyles.dash}>—</span>;
  const gates = raceGates(row.race, horses);
  return (
    <span className={styles.podium}>
      {row.result.ranking.slice(0, 3).map((id, i) => (
        <span key={id}>
          {i + 1}위 <HorseTag horse={horseOf(id)} gate={gates[id]} id={id} />
        </span>
      ))}
    </span>
  );
}

/** 삭제 버튼 — 이미 출발한 경주는 —, 지울 수 없는 경주는 이유(버튼을 비활성으로 두지 않는다) */
function RowAction({ row, now, onDelete }: { row: TimetableRow; now: number; onDelete: () => void }) {
  if (row.at <= now) return <span className={adminStyles.dash}>—</span>;
  const blocked = deleteBlockReason(row.at, now);
  if (blocked) return <span className={adminStyles.blocked}>{blocked}</span>;
  return (
    <button
      type="button"
      className={`btn btn-sm ${adminStyles.btnDangerOutline}`}
      onClick={onDelete}
      aria-label={`Race #${row.raceNo} ${formatKstTime(row.at)} 경주 삭제`}
    >
      삭제
    </button>
  );
}
