"use client";

import Modal from "@/components/Modal";
import { formatYmdKo } from "@/lib/kst";
import type { SeatBooking } from "../_hooks/useSeatBooking";
import { chairLabel } from "../_lib/labels";
import { formatBlock } from "../_lib/schedule";
import styles from "./seat.module.css";

interface ReserveConfirmModalProps {
  open: boolean;
  booking: SeatBooking;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 예약 안내 —예약 내용 + 유의 사항 → [확인하고 예약하기] */
export default function ReserveConfirmModal({ open, booking, error, onCancel, onConfirm }: ReserveConfirmModalProps) {
  const { branch, date, block, people, selectedChairs, busy } = booking;

  return (
    <Modal open={open} onClose={onCancel} label="예약 안내" variant="sheet" dismissible={!busy}>
      <div className={styles.confirm}>
        <span className={styles.confirmEyebrow}>SEAT RESERVATION</span>
        <h2 className={styles.confirmTitle}>예약 안내</h2>

        {branch && date && block && (
          <dl className={styles.confirmTicket}>
            <div>
              <dt>지점</dt>
              <dd>{branch.name}</dd>
            </div>
            <div>
              <dt>일시</dt>
              <dd>
                {formatYmdKo(date)} {formatBlock(block)}
              </dd>
            </div>
            <div>
              <dt>좌석</dt>
              <dd>{selectedChairs.map((c) => chairLabel(c.seat, c.no)).join(" · ")}</dd>
            </div>
            <div>
              <dt>인원</dt>
              <dd>{people}명</dd>
            </div>
          </dl>
        )}

        <ul className={styles.notes}>
          <li>예약 시간 10분 전까지 도착해 주세요. 10분이 지나면 자리가 풀릴 수 있어요.</li>
          <li>이용 시간은 1시간이에요. 다음 손님을 위해 시간을 지켜 주세요.</li>
          <li>결제 없이 예약만 되는 데모예요. 좌석 요금은 없어요.</li>
        </ul>

        {error && (
          <p className={styles.confirmError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.confirmActions}>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button type="button" className="btn btn-gold" onClick={onConfirm} disabled={busy}>
            {busy ? "예약하는 중…" : "확인하고 예약하기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
