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

/** 시각(time)이 지났는지 — 끝 시각이 지난 예약은 "이용 완료", 시작 시각이 지난 예약은 취소할 수 없다 */
function isAfter(date: string, time: string, now: number | null): boolean {
  if (now === null) return false;
  const today = kstDate(now);
  if (date < today) return true;
  if (date > today) return false;
  return kstMinutes(now) >= minutesOf(time);
}

/**
 * 좌석 예약 내역(11단계) — /seat 에서 한 예약 · 예약대기(서버의 내 예약), 최신순. 처음엔 최근 5건, "전체 보기"로 나머지를 펼친다.
 * 한 줄 = 날짜 · 시간대 STUB ┊ 지점 · 좌석(또는 예약대기) · 인원 ┊ 상태(예약됨 · 대기 중 · 입장 완료 · 이용 완료 · 노쇼) + 취소.
 * 취소하면 서버에서 목록을 다시 받아 사라지고, /seat 로 돌아가면 그 자리가 풀려 있다.
 * 예약은 시작 전까지, 예약대기는 시간대가 끝나기 전까지 취소할 수 있다(서버 규칙과 같다).
 */
export default function MySeats() {
  const { seatReservations, refreshSeatReservations } = useUser();
  const now = useNow();
  const { visible, expanded, hasMore, total, toggle } = useShowMore(seatReservations, PREVIEW);
  const sectionRef = useRef<HTMLElement>(null);
  const [error, setError] = useState("");

  const cancel = async (id: number) => {
    setError("");
    try {
      await cancelReservation(id);
      await refreshSeatReservations();
    } catch (e) {
      // 그새 시작됐거나 직원이 처리한 예약 — 서버 문구를 보여 주고 목록을 다시 받는다
      setError(e instanceof Error ? e.message : "취소하지 못했어요. 잠시 후 다시 시도해 주세요.");
      void refreshSeatReservations();
    }
    // 누른 버튼이 사라지므로 포커스를 섹션으로
    sectionRef.current?.focus();
  };

  return (
    <section ref={sectionRef} id="seats" tabIndex={-1} className={styles.section} aria-labelledby="seats-title">
      <SectionHead id="seats" label="MY SEATS" title="좌석 예약 내역" meta={`${seatReservations.length}건`} />
      {error && (
        <p className={styles.seatError} role="alert">
          {error}
        </p>
      )}

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
              <SeatRow
                key={entry.id}
                entry={entry}
                past={isAfter(entry.date, entry.end, now)}
                started={isAfter(entry.date, entry.start, now)}
                onCancel={() => cancel(entry.id)}
              />
            ))}
          </ol>
          {hasMore && <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="seats-list" />}
        </>
      )}
    </section>
  );
}

interface SeatRowProps {
  entry: SeatReservation;
  past: boolean; // 시간대가 끝났다
  started: boolean; // 시간대가 시작됐다
  onCancel: () => void;
}

function statusLabelOf(entry: SeatReservation, past: boolean, opened: boolean): string {
  if (entry.status === "NO_SHOW") return "노쇼";
  if (entry.status === "CHECKED_IN") return past ? "이용 완료" : "입장 완료";
  if (entry.kind === "WAITING") return past ? "대기 종료" : opened ? "자리 났어요" : "대기 중";
  return past ? "이용 완료" : "예약됨";
}

function SeatRow({ entry, past, started, onCancel }: SeatRowProps) {
  const [confirming, setConfirming] = useState(false);
  const waiting = entry.kind === "WAITING";
  // 예약대기에 자리가 났다(백엔드 notifiedAt) — 시간대가 지났으면 자리가 났어도 "대기 종료"
  const opened = waiting && !past && Boolean(entry.notifiedAt);
  const statusLabel = statusLabelOf(entry, past, opened);
  // 서버 규칙과 같다 — 방문 확인 · 노쇼 처리된 건은 취소할 수 없고, 예약은 시작 전까지만
  const cancelable = entry.status === "ACTIVE" && !past && (waiting || !started);

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
        {opened ? (
          <span className={styles.seatChairs}>
            예약대기 · 자리가 났어요!{" "}
            <Link href={`/seat?branch=${entry.branchId}`} className={styles.seatOpenLink}>
              지금 예약하기
            </Link>
          </span>
        ) : (
          <span className={styles.seatChairs}>{waiting ? "예약대기 · 자리가 나면 알려드려요" : entry.chairLabels.join(" · ")}</span>
        )}
      </div>

      <div className={styles.seatActions}>
        <span
          className={`${styles.seatStatus} ${waiting ? styles.seatStatusWaiting : ""} ${opened ? styles.seatStatusOpened : ""} ${past ? styles.seatStatusPast : ""}`}
        >
          {statusLabel}
        </span>
        {cancelable &&
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
