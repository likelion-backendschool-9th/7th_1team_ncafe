import Image from "next/image";
import Link from "next/link";
import { DAILY_RACE } from "../_data/events";
import { branchName, crowdedOf, EVENT_STATUS_LABEL, EVENT_TYPE_LABEL, formatEventPeriod, isFull, seatsLeft } from "../_lib/eventStatus";
import type { CafeEvent, EventStatus } from "../_types";
import EventApplyAction from "./EventApplyAction";
import styles from "./event.module.css";

interface EventCardProps {
  event: CafeEvent;
  status: EventStatus;
  hint: string; // 상태 옆 작은 글씨 — "D-10" · "오늘 종료"
  today: string; // KST — 신청 가능 여부
}

/**
 * 이벤트 한 장 — 가로로 긴 경마 티켓. 왼쪽 STUB 에 일련번호 · 작성 지점 · 상태,
 * 절취선 너머에 (썸네일) · 종류(쿠폰 지급 / 일반 참여) · 이름(상세 링크) · 기간 · 설명 · 신청 현황 · [자세히 보기] · 참여 신청.
 * 종료된 이벤트는 흐리게 한다. 상태는 색 + 기호 + 글자로 함께 보여 준다(BLUEPRINT 2.5).
 */
export default function EventCard({ event, status, hint, today }: EventCardProps) {
  const titleId = `event-${event.id}-title`;
  const detailHref = `/event/${event.id}`;

  return (
    <article className={`${styles.ticket} ${status === "ENDED" ? styles.ticketEnded : ""}`} aria-labelledby={titleId}>
      <div className={styles.stub}>
        <span className={styles.serial} aria-hidden>
          EVENT No.{String(event.id).padStart(2, "0")}
        </span>
        <span className={styles.branch}>
          <span className="visually-hidden">작성 지점 </span>
          {branchName(event.branchId)}
        </span>
        <EventStatusChip status={status} hint={hint} />
      </div>

      <div className={styles.main}>
        {event.thumbnail && (
          <div className={styles.thumb}>
            <Image src={event.thumbnail} alt="" fill sizes="112px" className={styles.thumbImg} />
          </div>
        )}
        <div className={styles.text}>
          <EventTypeTag event={event} />
          <h2 id={titleId} className={styles.title}>
            <Link href={detailHref} className={styles.titleLink}>
              {event.title}
            </Link>
          </h2>
          <p className={styles.dates}>
            <span className="visually-hidden">기간 </span>
            {formatEventPeriod(event)}
          </p>
          <p className={styles.desc}>{event.description}</p>
          <ApplyProgress event={event} />
        </div>
        <div className={styles.actions}>
          <Link href={detailHref} className="btn btn-outline">
            자세히 보기<span className="visually-hidden"> — {event.title}</span>
          </Link>
          <EventApplyAction event={event} today={today} variant="card" />
        </div>
      </div>
    </article>
  );
}

/** 상태 알약 — 진행 중(짙은 바탕 · 점) · 예정(테두리 · 시계) · 종료(회색 · 네모). 상세 페이지도 쓴다 */
export function EventStatusChip({ status, hint }: { status: EventStatus; hint?: string }) {
  return (
    <span className={`${styles.status} ${styles[`status_${status}`]}`}>
      <span aria-hidden>{STATUS_GLYPH[status]}</span>
      {EVENT_STATUS_LABEL[status]}
      {hint && <small className={styles.statusHint}>{hint}</small>}
    </span>
  );
}

const STATUS_GLYPH: Record<EventStatus, string> = { ONGOING: "●", UPCOMING: "◷", ENDED: "■" };

/** 종류 표시 — 쿠폰 지급(금색 · 지급 장수) / 일반 참여(테두리) */
export function EventTypeTag({ event }: { event: CafeEvent }) {
  return event.coupon ? (
    <span className={`${styles.typeTag} ${styles.typeCoupon}`}>
      {EVENT_TYPE_LABEL.COUPON} · {event.couponAmount}장
    </span>
  ) : (
    <span className={styles.typeTag}>{EVENT_TYPE_LABEL.JOIN}</span>
  );
}

/**
 * 신청 현황 — 쿠폰 지급 이벤트는 선착순 막대("선착순 30명 · 12명 신청 · 남은 자리 18", 마감이면 "선착순 마감"),
 * 일반 참여 이벤트는 신청 기록 수만("8명 참여"). 상세 페이지도 쓴다
 */
export function ApplyProgress({ event }: { event: CafeEvent }) {
  const left = seatsLeft(event);
  if (left === null || event.capacity === null) {
    return <p className={styles.joinCount}>{event.applyCount > 0 ? `${event.applyCount}명 참여` : "첫 참여자를 기다려요"}</p>;
  }
  const full = isFull(event);
  const crowded = crowdedOf(event);
  return (
    <div className={styles.meter}>
      <p className={styles.meterText}>
        <span>
          선착순 {event.capacity}명 · {crowded}명 신청
        </span>
        <strong className={full ? styles.meterFull : undefined}>{full ? "선착순 마감" : `남은 자리 ${left}`}</strong>
      </p>
      <span
        className={styles.meterBar}
        role="progressbar"
        aria-label="선착순 신청 현황"
        aria-valuemin={0}
        aria-valuemax={event.capacity}
        aria-valuenow={Math.min(crowded, event.capacity)}
      >
        <span style={{ width: `${Math.min(100, (crowded / event.capacity) * 100)}%` }} />
      </span>
    </div>
  );
}

/**
 * DAILY RACE — /event 맨 위에 늘 붙는 상시 고정 카드(사용자 결정 2026-10-27). 전 지점 공통이고 지점 필터와 상관없이 보인다.
 * 시각은 관리자 경주 관리의 일정 문구("오늘 12:30 · 18:00"), 참여는 /race 에서 쿠폰을 거는 것이라 신청 대신 이동 버튼.
 */
export function DailyRaceCard({ raceTimes }: { raceTimes: string }) {
  return (
    <article className={`${styles.ticket} ${styles.ticketFixed}`} aria-labelledby="event-daily-title">
      <div className={styles.stub}>
        <span className={styles.serial} aria-hidden>
          FIXED EVENT
        </span>
        <span className={styles.branch}>전 지점</span>
        {raceTimes && <span className={styles.time}>{raceTimes}</span>}
        <EventStatusChip status="ONGOING" />
      </div>

      <div className={styles.main}>
        <div className={styles.text}>
          <span className={`${styles.typeTag} ${styles.typeFixed}`}>상시 · 고정</span>
          <h2 id="event-daily-title" className={styles.title}>
            {DAILY_RACE.title}
          </h2>
          <p className={styles.dates}>매일 · 경주 일정별</p>
          <p className={styles.desc}>{DAILY_RACE.description}</p>
        </div>
        <div className={styles.actions}>
          <Link href={DAILY_RACE.ctaHref} className="btn">
            {DAILY_RACE.ctaLabel} <span aria-hidden>›</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
