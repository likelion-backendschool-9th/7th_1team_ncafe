"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import { ApiError } from "@/lib/api";
import { formatYmdKo } from "@/lib/kst";
import type { SeatReservation } from "@/types/common";
import type { SeatBooking } from "../_hooks/useSeatBooking";
import { formatBlock } from "../_lib/schedule";
import { BellIcon } from "./icons";
import ModalLogin from "./ModalLogin";
import styles from "./seat.module.css";

interface WaitlistModalProps {
  open: boolean;
  booking: SeatBooking;
  onClose: () => void;
}

/**
 * 예약대기 —"원하는 좌석이 없으면? 예약대기를 신청하세요!" + 종 + 요금 · 취소 · 종료 안내 → [신청하기].
 * 신청하면 /my 좌석 예약 내역에 "대기 중"으로 남는다. 요금은 없다.
 * 로그인하지 않았으면 [신청하기] 자리에 로그인 칸이 나오고, 로그인하면 바로 이어서 신청한다(ModalLogin).
 */
export default function WaitlistModal({ open, booking, onClose }: WaitlistModalProps) {
  const { branch, date, block, people, busy, waitingHere, joinWaitlist } = booking;
  const [done, setDone] = useState<SeatReservation | null>(null);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false); // 신청 요청이 401 — 세션이 끝난 경우
  const { member, loading } = useAuth();
  const needLogin = unauthorized || (!loading && member === null);

  const close = () => {
    if (busy) return;
    onClose();
    setDone(null);
    setError("");
    setUnauthorized(false);
  };

  const submit = async () => {
    setError("");
    setUnauthorized(false);
    try {
      const result = await joinWaitlist();
      if (result) setDone(result);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUnauthorized(true); // 로그인 칸으로 — 로그인하면 이 신청을 이어서 보낸다
        return;
      }
      // 서버가 막은 이유(이미 신청함 · 시간대 시작 · 노쇼 제한)는 그 문구를 그대로 보여 준다
      setError(e instanceof Error ? e.message : "신청하지 못했어요. 잠시 후 다시 시도해 주세요.");
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

          {needLogin && !waitingHere ? (
            <ModalLogin submitLabel="로그인하고 신청하기" busyLabel="신청하는 중…" busy={busy} onCancel={close} onLoggedIn={submit} />
          ) : (
            <button type="button" className="btn btn-gold btn-block" disabled={busy || waitingHere} onClick={submit}>
              {waitingHere ? "이미 신청한 시간대예요" : busy ? "신청하는 중…" : "신청하기"}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
