"use client";

import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/Modal";
import { formatYmdKo } from "@/lib/kst";
import type { SeatReservation } from "@/types/common";
import type { SeatBooking } from "../_hooks/useSeatBooking";
import { formatBlock } from "../_lib/schedule";
import { BellIcon } from "./icons";
import styles from "./seat.module.css";

interface WaitlistModalProps {
  open: boolean;
  booking: SeatBooking;
  onClose: () => void;
}

/**
 * 예약대기 —"원하는 좌석이 없으면? 예약대기를 신청하세요!" + 종 + 요금 · 취소 · 종료 안내 → [신청하기].
 * 신청하면 /my 좌석 예약 내역에 "대기 중"으로 남는다. 요금은 없다.
 */
export default function WaitlistModal({ open, booking, onClose }: WaitlistModalProps) {
  const { branch, date, block, people, busy, waitingHere, joinWaitlist } = booking;
  const [done, setDone] = useState<SeatReservation | null>(null);
  const [error, setError] = useState("");

  const close = () => {
    if (busy) return;
    onClose();
    setDone(null);
    setError("");
  };

  const submit = async () => {
    setError("");
    try {
      const result = await joinWaitlist();
      if (result) setDone(result);
    } catch {
      setError("신청하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const schedule = branch && date && block ? `${branch.name} · ${formatYmdKo(date)} ${formatBlock(block)}` : "";

  return (
    <Modal open={open} onClose={close} label="예약대기 신청" size="sm" dismissible={!busy}>
      {done ? (
        <div className={styles.confirm}>
          <span className={styles.bell} aria-hidden>
            <BellIcon />
          </span>
          <h2 className={styles.confirmTitle}>예약대기를 신청했어요</h2>
          <p className={styles.confirmNote}>
            {schedule} · {done.people}명
            <br />
            자리가 나면 알려드릴게요.
          </p>
          <div className={styles.confirmActions}>
            <button type="button" className="btn btn-outline" onClick={close}>
              닫기
            </button>
            <Link href="/my#seats" className="btn" onClick={close}>
              마이페이지에서 보기
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.confirm}>
          <h2 className={styles.confirmTitle}>
            원하는 좌석이 없으면?
            <br />
            예약대기를 신청하세요!
          </h2>
          <p className={styles.confirmNote}>자리가 취소되면 알려드려요.</p>
          <span className={styles.bell} aria-hidden>
            <BellIcon />
          </span>

          <dl className={styles.infoRows}>
            <div>
              <dt>대기 일정</dt>
              <dd>{schedule}</dd>
            </div>
            <div>
              <dt>인원</dt>
              <dd>{people}명</dd>
            </div>
            <div>
              <dt>이용 요금</dt>
              <dd>
                <strong>무료</strong>
              </dd>
            </div>
            <div>
              <dt>신청 취소</dt>
              <dd>마이페이지에서 언제든</dd>
            </div>
            <div>
              <dt>신청 종료</dt>
              <dd>{block ? `${block.start} 시작 전까지` : ""}</dd>
            </div>
          </dl>

          {error && (
            <p className={styles.confirmError} role="alert">
              {error}
            </p>
          )}

          <button type="button" className="btn btn-gold btn-block" disabled={busy || waitingHere} onClick={submit}>
            {waitingHere ? "이미 신청한 시간대예요" : busy ? "신청하는 중…" : "신청하기"}
          </button>
        </div>
      )}
    </Modal>
  );
}
