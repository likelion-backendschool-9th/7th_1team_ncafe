import Link from "next/link";
import { EVENT_STATUS_LABEL, formatEventPeriod } from "../_lib/eventStatus";
import type { CafeEvent, EventStatus } from "../_types";
import styles from "./event.module.css";

interface EventCardProps {
  event: CafeEvent;
  status: EventStatus;
  hint: string; // 상태 옆 작은 글씨 — "D-10" · "오늘 종료"
  timeText: string | null; // 시각 칸 — "오늘 12:30 · 18:00"(경주 일정) · 직접 입력 문구 · 없음
}

/**
 * 이벤트 한 장 — 가로로 긴 경마 티켓. 왼쪽 STUB 에 일련번호 · 운영 안내 · 시각 · 상태,
 * 절취선 너머에 이름(상세 링크) · 기간 · 설명 · [자세히 보기] · 이동 버튼. 종료된 이벤트는 흐리게 하고 이동 버튼을 뺀다.
 * 상태는 색 + 기호 + 글자로 함께 보여 준다(BLUEPRINT 2.5).
 */
export default function EventCard({ event, status, hint, timeText }: EventCardProps) {
  const titleId = `event-${event.id}-title`;
  const detailHref = `/event/${event.id}`;

  return (
    <article className={`${styles.ticket} ${status === "ENDED" ? styles.ticketEnded : ""}`} aria-labelledby={titleId}>
      <div className={styles.stub}>
        <span className={styles.serial} aria-hidden>
          EVENT No.{String(event.id).padStart(2, "0")}
        </span>
        <span className={styles.period}>{event.period}</span>
        {timeText && <span className={styles.time}>{timeText}</span>}
        <EventStatusChip status={status} hint={hint} />
      </div>

      <div className={styles.main}>
        <div className={styles.text}>
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
        </div>
        <div className={styles.actions}>
          <Link href={detailHref} className="btn btn-outline">
            자세히 보기<span className="visually-hidden"> — {event.title}</span>
          </Link>
          {event.ctaHref && event.ctaLabel && status !== "ENDED" && (
            <Link href={event.ctaHref} className={`btn ${styles.cta}`}>
              {event.ctaLabel} <span aria-hidden>›</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

const STATUS_GLYPH: Record<EventStatus, string> = { ONGOING: "●", UPCOMING: "◷", ENDED: "■" };

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
