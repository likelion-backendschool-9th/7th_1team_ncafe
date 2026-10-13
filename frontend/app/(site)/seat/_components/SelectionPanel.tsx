"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { formatYmdKo } from "@/lib/kst";
import type { SeatBooking } from "../_hooks/useSeatBooking";
import { chairDescription, chairLabel } from "../_lib/labels";
import { formatBlock } from "../_lib/schedule";
import type { Chair } from "../_types";
import { chairClassName, chairGlyph } from "./Chair";
import { ChevronLeftIcon, ChevronUpIcon, CloseIcon } from "./icons";
import styles from "./seat.module.css";

interface SelectionProps {
  booking: SeatBooking;
  /** [예약하기] — 확인창을 연다 */
  onReserve: () => void;
}

function scheduleText(booking: SeatBooking): string {
  const { branch, date, block, people } = booking;
  if (!branch || !date || !block) return "";
  return `${branch.name} · ${formatYmdKo(date, false)} ${formatBlock(block)} · ${people ?? 0}명`;
}

/** 고른 의자 목록(선택 좌석 카드) —없으면 "선택한 좌석이 없습니다." */
function SelectedList({ chairs, target, onRemove }: { chairs: Chair[]; target: number; onRemove: (id: string) => void }) {
  if (chairs.length === 0) {
    return (
      <div className={styles.selEmpty}>
        <strong>선택한 좌석이 없습니다.</strong>
        <span>배치도에서 빈 자리 {target}개를 골라 주세요.</span>
      </div>
    );
  }
  return (
    <ul className={styles.selList}>
      {chairs.map((chair) => {
        const name = chairLabel(chair.seat, chair.no);
        return (
          <li key={chair.id} className={styles.selItem}>
            <span className={`${chairClassName("AVAILABLE", { selected: true, bar: chair.seat.type === "BAR" })} ${styles.selSwatch}`} aria-hidden>
              {chairGlyph("AVAILABLE", { selected: true })}
            </span>
            <span className={styles.selText}>
              <span className={styles.selLabel}>{name}</span>
              <span className={styles.selDesc}>{chairDescription(chair.seat)}</span>
            </span>
            <button type="button" className={styles.selRemove} aria-label={`${name} 빼기`} onClick={() => onRemove(chair.id)}>
              <CloseIcon />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * STEP 2 선택 좌석(PC 패널) — ‹ 일정 선택 · "선택 좌석 n/N" · 전체삭제 · 카드 목록 · 안내 · [예약하기].
 * 인원 수만큼 골라야 [예약하기]가 켜진다.
 */
export default function SelectionPanel({ booking, onReserve }: SelectionProps) {
  const { people, selectedChairs, removeChair, clearSelected, backToSchedule, hint, busy } = booking;
  const count = selectedChairs.length;
  const target = people ?? 0;
  const complete = target > 0 && count === target;

  return (
    <>
      <div className={styles.panelHead}>
        <div>
          <button type="button" className={styles.backBtn} onClick={backToSchedule}>
            <ChevronLeftIcon /> 일정 선택
          </button>
          <h2 className={styles.panelTitle}>
            선택 좌석{" "}
            <span className={styles.selCount}>
              <strong>{count}</strong>/{target}
            </span>
          </h2>
        </div>
        <button type="button" className={styles.textBtn} disabled={count === 0} onClick={clearSelected}>
          전체삭제
        </button>
      </div>

      <div className={styles.panelBody}>
        <SelectedList chairs={selectedChairs} target={target} onRemove={removeChair} />
      </div>

      <div className={styles.panelFoot}>
        <p className={styles.status} role="status">
          {hint?.text ?? (complete ? "모두 골랐어요. 예약하기를 눌러 주세요." : `${target - count}석 더 골라 주세요.`)}
        </p>
        <p className={styles.selSummary}>{scheduleText(booking)}</p>
        <button type="button" className="btn btn-gold btn-block" disabled={!complete || busy} onClick={onReserve}>
          예약하기
        </button>
      </div>
    </>
  );
}

/**
 * 모바일 — 화면 아래 고정 바 +누르면 목록 Bottom Sheet. PC 패널 대신 ≤1023px 에서만 보인다.
 * 시트는 ESC · 배경 탭으로 닫힌다(공용 Modal).
 */
export function SelectionBar({ booking, onReserve }: SelectionProps) {
  const { people, selectedChairs, removeChair, backToSchedule, hint, busy } = booking;
  const [open, setOpen] = useState(false);
  const count = selectedChairs.length;
  const target = people ?? 0;
  const complete = target > 0 && count === target;
  const names = selectedChairs.map((c) => chairLabel(c.seat, c.no)).join(" · ");

  return (
    <>
      <div className={styles.mobileBar}>
        <button type="button" className={styles.mobileBarInfo} aria-expanded={open} onClick={() => setOpen(true)}>
          <span className={styles.mobileBarTitle}>
            선택 좌석 {count}/{target} <ChevronUpIcon />
          </span>
          <span className={styles.mobileBarSub} role="status">
            {hint?.text ?? (count === 0 ? "배치도에서 자리를 골라 주세요" : names)}
          </span>
        </button>
        <button type="button" className="btn btn-gold" disabled={!complete || busy} onClick={onReserve}>
          예약하기
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} label="선택 좌석" variant="sheet">
        <div className={styles.sheet}>
          <h2 className={styles.panelTitle}>
            선택 좌석{" "}
            <span className={styles.selCount}>
              <strong>{count}</strong>/{target}
            </span>
          </h2>
          <p className={styles.selSummary}>{scheduleText(booking)}</p>
          <SelectedList chairs={selectedChairs} target={target} onRemove={removeChair} />
          <div className={styles.sheetActions}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setOpen(false);
                backToSchedule();
              }}
            >
              일정 변경
            </button>
            <button
              type="button"
              className="btn btn-gold"
              disabled={!complete || busy}
              onClick={() => {
                setOpen(false);
                onReserve();
              }}
            >
              예약하기
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
