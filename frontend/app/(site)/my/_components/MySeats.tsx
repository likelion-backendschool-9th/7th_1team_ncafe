"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { formatYmdKo, kstDate, kstMinutes, minutesOf } from "@/lib/kst";
import { useNow } from "@/lib/useCountdown";
import type { SeatReservation } from "@/types/common";
import { cancelReservation } from "../../seat/_lib/seatService";
import { useShowMore } from "../_hooks/useShowMore";
import { SectionEmpty, SectionHead, ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 5;

/** 시간대가 끝난 뒤인지 — 지난 예약은 "이용 완료" */
function isPast(entry: SeatReservation, now: number | null): boolean {
  if (now === null) return false;
  const today = kstDate(now);
  if (entry.date < today) return true;
  if (entry.date > today) return false;
  return kstMinutes(now) >= minutesOf(entry.end);
}

/**
 * 좌석 예약 내역(11단계) — /seat 에서 한 예약 · 예약대기, 최신순. 처음엔 최근 5건, "전체 보기"로 나머지를 펼친다.
 * 한 줄 = 날짜 · 시간대 STUB ┊ 지점 · 좌석(또는 예약대기) · 인원 ┊ 상태(예약됨 · 대기 중 · 이용 완료) + 취소.
 * 취소하면 목록에서 사라지고, /seat 로 돌아가면 그 자리가 풀려 있다(배치도는 내 예약을 겹쳐 그리므로).
 */
export default function MySeats() {
  const { seatReservations, cancelSeatReservation } = useUser();
  const now = useNow();
  const { visible, expanded, hasMore, total, toggle } = useShowMore(seatReservations, PREVIEW);
  const sectionRef = useRef<HTMLElement>(null);

  const cancel = async (id: string) => {
    await cancelReservation(id);
    cancelSeatReservation(id);
    // 누른 버튼이 사라지므로 포커스를 섹션으로
    sectionRef.current?.focus();
  };

  return (
    <section ref={sectionRef} id="seats" tabIndex={-1} className={styles.section} aria-labelledby="seats-title">
      <SectionHead id="seats" label="MY SEATS" title="좌석 예약 내역" meta={`${seatReservations.length}건`} />

      {seatReservations.length === 0 ? (
        <SectionEmpty
          title="아직 예약한 좌석이 없어요"
          action={
            <Link href="/seat" className="btn btn-outline btn-sm">
              좌석 예약하기
            </Link>
          }
        >
          배치도에서 자리를 골라 예약하면 예약한 자리와 시간이 여기에 모여요.
        </SectionEmpty>
      ) : (
        <>
          <ol id="seats-list" className={styles.seatList}>
            {visible.map((entry) => (
              <SeatRow key={entry.id} entry={entry} past={isPast(entry, now)} onCancel={() => cancel(entry.id)} />
            ))}
          </ol>
          {hasMore && <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="seats-list" />}
        </>
      )}
    </section>
  );
}

function SeatRow({ entry, past, onCancel }: { entry: SeatReservation; past: boolean; onCancel: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const waiting = entry.kind === "WAITING";
  const statusLabel = past ? (waiting ? "대기 종료" : "이용 완료") : waiting ? "대기 중" : "예약됨";

  return (
    <li className={`${styles.seatRow} ${past ? styles.seatRowPast : ""}`}>
      <div className={styles.seatStub}>
        <span className={styles.seatDate}>{formatYmdKo(entry.date, false)}</span>
        <span className={styles.seatTime}>
          {entry.start}~{entry.end}
        </span>
      </div>

      <div className={styles.seatBody}>
        <span className={styles.seatBranch}>
          {entry.branchName}
          <small>{entry.people}명</small>
        </span>
        <span className={styles.seatChairs}>{waiting ? "예약대기 · 자리가 나면 알려드려요" : entry.chairLabels.join(" · ")}</span>
      </div>

      <div className={styles.seatActions}>
        <span className={`${styles.seatStatus} ${waiting ? styles.seatStatusWaiting : ""} ${past ? styles.seatStatusPast : ""}`}>
          {statusLabel}
        </span>
        {!past &&
          (confirming ? (
            <span className={styles.seatConfirm}>
              취소할까요?
              <button type="button" className={`${styles.seatTextBtn} ${styles.seatTextBtnDanger}`} onClick={onCancel}>
                취소
              </button>
              {/* 확인 문구로 바뀌면서 누른 버튼이 사라지므로 "아니요"에 포커스를 둔다 */}
              <button type="button" className={styles.seatTextBtn} autoFocus onClick={() => setConfirming(false)}>
                아니요
              </button>
            </span>
          ) : (
            <button type="button" className={styles.seatTextBtn} onClick={() => setConfirming(true)}>
              {waiting ? "대기 취소" : "예약 취소"}
            </button>
          ))}
      </div>
    </li>
  );
}
