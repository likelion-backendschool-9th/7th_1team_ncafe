"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatYmdKo } from "@/lib/kst";
import type { SeatReservation } from "@/types/common";
import styles from "./seat.module.css";

interface ReservationDoneProps {
  reservation: SeatReservation;
  onRestart: () => void;
}

/** 예약 완료 — "예약되었습니다." 티켓 스탬프 + 예약 내용 + [마이페이지에서 보기] [다른 좌석 예약하기] */
export default function ReservationDone({ reservation, onRestart }: ReservationDoneProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // 패널이 통째로 바뀌므로 포커스를 제목으로
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.done}>
      <span className={styles.stamp} aria-hidden>
        RESERVED
      </span>
      <h2 ref={headingRef} tabIndex={-1} className={styles.doneTitle}>
        예약되었습니다.
      </h2>
      <p className={styles.doneLead}>예약 시간 10분 전까지 와 주세요. 자리는 1시간 동안 이용할 수 있어요.</p>

      <dl className={styles.doneTicket}>
        <div>
          <dt>예약 번호</dt>
          <dd>{reservation.id}</dd>
        </div>
        <div>
          <dt>지점</dt>
          <dd>{reservation.branchName}</dd>
        </div>
        <div>
          <dt>일시</dt>
          <dd>
            {formatYmdKo(reservation.date)} {reservation.start}~{reservation.end}
          </dd>
        </div>
        <div>
          <dt>좌석</dt>
          <dd>{reservation.chairLabels.join(" · ")}</dd>
        </div>
        <div>
          <dt>인원</dt>
          <dd>{reservation.people}명</dd>
        </div>
      </dl>

      <div className={styles.doneActions}>
        <Link href="/my#seats" className="btn btn-block">
          마이페이지에서 보기
        </Link>
        <button type="button" className="btn btn-outline btn-block" onClick={onRestart}>
          다른 좌석 예약하기
        </button>
      </div>
    </div>
  );
}
