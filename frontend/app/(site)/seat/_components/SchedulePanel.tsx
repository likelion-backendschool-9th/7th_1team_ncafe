"use client";

import { useId, useState } from "react";
import { formatYmdKo } from "@/lib/kst";
import type { SeatBooking } from "../_hooks/useSeatBooking";
import { matchesTimeFilter, TIME_FILTERS, type TimeFilterId } from "../_lib/schedule";
import { SEAT_MAX_PEOPLE } from "../_lib/seatService";
import DatePicker from "./DatePicker";
import { PinIcon, ResetIcon } from "./icons";
import styles from "./seat.module.css";

interface SchedulePanelProps {
  booking: SeatBooking;
  onWaitlist: () => void;
}

/**
 * STEP 1 일정 선택 — 달력 → 지점 칩 → 인원 1~8 → 시간대 범위 필터 + 1시간 카드(잔여석) → [좌석 선택하기].
 * 이미 고른 날짜 · 지점 · 시간대를 다시 눌러도 선택이 풀리지 않는다(풀리면 골라 둔 의자까지 사라져 버그처럼 보인다).
 * 시간대가 매진이면 [좌석 선택하기] 대신 [예약대기 신청하기]. 시간대를 고르면 배치도의 빈 자리를 바로 눌러도 된다.
 */
export default function SchedulePanel({ booking, onWaitlist }: SchedulePanelProps) {
  const { today, range, date, branch, branches, people, block, timeBlocks, slots, ready, soldOut, waitingHere, hint, todayClosed } = booking;
  const { pickDate, pickBranch, pickPeople, pickBlock, startSeats } = booking;
  const ids = useId();
  const [timeFilter, setTimeFilter] = useState<TimeFilterId>("ALL");
  const visibleBlocks = timeBlocks.filter((b) => matchesTimeFilter(b, timeFilter));
  const allClosed = slots !== null && slots.every((s) => s.state === "CLOSED");

  return (
    <>
      <div className={styles.panelHead}>
        <div>
          <span className={styles.panelEyebrow}>STEP 1 · SCHEDULE</span>
          <h2 className={styles.panelTitle}>일정 선택</h2>
        </div>
      </div>

      <div className={styles.panelBody}>
        <section aria-labelledby={`${ids}-date`}>
          <div className={styles.fieldHead}>
            <h3 id={`${ids}-date`} className={styles.fieldLabel}>
              날짜
            </h3>
            {date && <span className={styles.fieldNote}>{formatYmdKo(date)}</span>}
          </div>
          {today && range && date ? (
            <DatePicker value={date} today={today} min={range.from} max={range.to} onChange={pickDate} />
          ) : (
            <div className={styles.calLoading}>달력을 불러오는 중…</div>
          )}
          {todayClosed && date && date !== today && (
            <p className={styles.fieldNote}>오늘 예약할 수 있는 시간은 지나서 내일로 골라 두었어요.</p>
          )}
        </section>

        <section aria-labelledby={`${ids}-branch`}>
          <div className={styles.fieldHead}>
            <h3 id={`${ids}-branch`} className={styles.fieldLabel}>
              지점
            </h3>
          </div>
          <div className={styles.chips}>
            {branches.map((b) => {
              const pressed = branch?.id === b.id;
              return (
                <button key={b.id} type="button" className={styles.chipBtn} aria-pressed={pressed} onClick={() => !pressed && pickBranch(b.id)}>
                  {pressed && <PinIcon />}
                  {b.name}
                </button>
              );
            })}
          </div>
          {branch && <p className={styles.fieldNote}>{branch.address}</p>}
        </section>

        <section aria-labelledby={`${ids}-people`}>
          <div className={styles.fieldHead}>
            <h3 id={`${ids}-people`} className={styles.fieldLabel}>
              인원
            </h3>
            {people !== null && (
              <button type="button" className={styles.resetBtn} onClick={() => pickPeople(null)}>
                <ResetIcon /> 초기화
              </button>
            )}
          </div>
          <div className={styles.people}>
            {Array.from({ length: SEAT_MAX_PEOPLE }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={styles.peopleBtn} aria-pressed={people === n} aria-label={`${n}명`} onClick={() => pickPeople(n)}>
                {n}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby={`${ids}-time`}>
          <div className={styles.fieldHead}>
            <h3 id={`${ids}-time`} className={styles.fieldLabel}>
              시간대
            </h3>
            <span className={styles.fieldNote}>1시간 이용</span>
          </div>
          <div className={styles.timeFilters} role="group" aria-label="시간대 범위">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={styles.filterBtn}
                aria-pressed={timeFilter === f.id}
                title={f.id === "ALL" ? "09:00~22:00" : `${String(Math.max(f.fromHour, 9)).padStart(2, "0")}:00~${String(Math.min(f.toHour, 22)).padStart(2, "0")}:00`}
                onClick={() => setTimeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {allClosed && <p className={styles.blockNote}>이 날은 예약할 수 있는 시간대가 모두 지났어요. 다른 날짜를 골라 주세요.</p>}
          <div className={styles.blocks}>
            {visibleBlocks.map((b) => {
              const slot = slots?.find((s) => s.start === b.start) ?? null;
              const closed = slot?.state === "CLOSED";
              const full = slot !== null && slot.available === 0;
              const pressed = block?.start === b.start;
              const seatsText = slot === null ? "불러오는 중" : closed ? "마감" : `잔여 ${slot.available}석 / ${slot.total}석`;
              return (
                <button
                  key={b.start}
                  type="button"
                  className={styles.blockBtn}
                  aria-pressed={pressed}
                  disabled={closed || slot === null}
                  aria-label={`${b.start}부터 ${b.end}까지, ${seatsText}${slot?.state === "LIVE" ? ", 진행 중" : ""}${!closed && full ? ", 매진" : ""}`}
                  onClick={() => !pressed && pickBlock(b)}
                >
                  <span className={styles.blockTime} aria-hidden>
                    {b.start}
                    <small>~{b.end}</small>
                  </span>
                  <span className={styles.blockSeats} aria-hidden>
                    {slot === null ? "…" : closed ? "마감" : (
                      <>
                        <strong>{slot.available}</strong>/{slot.total}석
                      </>
                    )}
                  </span>
                  {slot?.state === "LIVE" && (
                    <span className={`${styles.blockTag} ${styles.blockTagLive}`} aria-hidden>
                      진행 중
                    </span>
                  )}
                  {!closed && full && (
                    <span className={`${styles.blockTag} ${styles.blockTagFull}`} aria-hidden>
                      매진
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {visibleBlocks.length === 0 && <p className={styles.blockNote}>이 범위에는 시간대가 없어요.</p>}
        </section>
      </div>

      <div className={styles.panelFoot}>
        <p className={styles.status} role="status">
          {hint?.text ??
            (!ready
              ? "날짜 · 지점 · 인원 · 시간대를 모두 고르면 좌석을 고를 수 있어요."
              : soldOut
                ? "이 시간대는 자리가 다 찼어요. 예약대기를 신청하면 자리가 날 때 알려드려요."
                : `${people}명 · 배치도의 빈 자리를 눌러 고르세요.`)}
        </p>
        {ready && soldOut ? (
          <button type="button" className="btn btn-gold btn-block" disabled={waitingHere} onClick={onWaitlist}>
            {waitingHere ? "예약대기 신청됨" : "예약대기 신청하기"}
          </button>
        ) : (
          <button type="button" className="btn btn-gold btn-block" disabled={!ready} onClick={startSeats}>
            좌석 선택하기
          </button>
        )}
      </div>
    </>
  );
}
