"use client";

import { useId, useState, type SubmitEvent } from "react";
import { BASE_RACE_TIMES } from "@/lib/raceSchedule";
import { formatRaceTimes } from "@/lib/time";
import adminStyles from "../../_components/admin.module.css";
import type { ToastMessage } from "../../_components/AdminToast";
import { useScheduleEditor } from "../_hooks/useScheduleEditor";
import { SCHEDULE_LIMITS } from "../_lib/validateSchedule";
import styles from "./raceAdmin.module.css";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

/**
 * 경주 시간표 편집 — 시각 칩(× 로 빼기) + 시각 추가 → [시간표 저장].
 * 저장하면 지금 뒤에 출발하는 경주부터 새 시간표를 따른다(이미 출발한 경주 · 기록 · 경주 번호는 그대로). 같은 브라우저의 손님 화면에 바로 반영된다.
 */
export default function ScheduleEditor({ show }: { show: Show }) {
  const s = useScheduleEditor(show);
  const [newTime, setNewTime] = useState("");
  const uid = useId();
  const errorId = `${uid}-error`;

  function handleAdd(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (s.add(newTime)) setNewTime("");
  }

  return (
    <div className={styles.editor}>
      <div className={styles.sectionHead}>
        <div>
          <h3 className={styles.subTitle}>경주 시간표</h3>
          <p className={styles.sectionDesc}>매일 이 시각에 모든 손님이 같은 경주를 함께 봐요.</p>
        </div>
        {!s.isDefault && (
          <button type="button" className="btn btn-outline btn-sm" onClick={s.fillDefault}>
            기본 시간표({formatRaceTimes(BASE_RACE_TIMES)})로
          </button>
        )}
      </div>

      <ul className={styles.chips} aria-label="경주 시각">
        {s.times.map((time) => {
          const isNew = s.added.includes(time);
          return (
            <li key={time} className={`${styles.chip} ${isNew ? styles.chipNew : ""}`}>
              {time}
              {isNew && <span className={styles.chipTag}>NEW</span>}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => s.remove(time)}
                aria-label={`${time} 경주 빼기`}
              >
                ×
              </button>
            </li>
          );
        })}
        {s.times.length === 0 && <li className={styles.diff}>시각이 없어요 — 하나 이상 추가해 주세요.</li>}
      </ul>

      <form className={styles.addRow} onSubmit={handleAdd}>
        <label className={adminStyles.field}>
          <span className={adminStyles.label}>시각 추가</span>
          <input
            type="time"
            step={60}
            className={`${adminStyles.input} ${styles.timeInput}`}
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            aria-describedby={s.error ? errorId : undefined}
          />
        </label>
        <button type="submit" className="btn btn-outline">
          + 추가
        </button>
      </form>

      {s.error && (
        <p id={errorId} className={adminStyles.error} role="alert">
          {s.error}
        </p>
      )}

      <div className={styles.editorFoot}>
        <div className={styles.rules}>
          {s.dirty ? (
            <p className={styles.diff} aria-live="polite">
              변경:{" "}
              {s.added.length > 0 && (
                <>
                  추가 <strong>{s.added.join(", ")}</strong>
                </>
              )}
              {s.added.length > 0 && s.removed.length > 0 && " · "}
              {s.removed.length > 0 && (
                <>
                  삭제 <strong>{s.removed.join(", ")}</strong>
                </>
              )}
              {" "}— 아직 저장하지 않았어요.
            </p>
          ) : (
            <p className={styles.diff}>지금 시간표: 매일 {formatRaceTimes(s.current)}</p>
          )}
          <span>
            하루 최대 {SCHEDULE_LIMITS.maxPerDay}경주 · 경주 사이 {SCHEDULE_LIMITS.minGapMinutes}분 이상 · 23:50 전까지
          </span>
          <span>저장하면 지금 뒤에 출발하는 경주부터 적용돼요. 이미 출발한 경주와 기록은 바뀌지 않아요.</span>
        </div>
        {/* 바꾼 내용이 있을 때만 — 누를 수 없는 버튼을 두지 않는다 */}
        {s.dirty && (
          <div className={styles.editorActions}>
            <button type="button" className="btn btn-outline" onClick={s.cancel} disabled={s.busy}>
              되돌리기
            </button>
            <button type="button" className="btn btn-gold" onClick={s.save} disabled={s.busy}>
              시간표 저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
