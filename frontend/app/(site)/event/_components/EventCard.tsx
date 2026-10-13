import Link from "next/link";
import type { CafeEvent } from "../_types";
import styles from "./event.module.css";

/**
 * 이벤트 한 장 — 가로로 긴 경마 티켓. 왼쪽 STUB 에 일련번호 · 기간 · 시각,
 * 절취선 너머에 이름 · 설명 · 이동 버튼.
 */
export default function EventCard({ event }: { event: CafeEvent }) {
  const titleId = `event-${event.id}-title`;

  return (
    <article className={styles.ticket} aria-labelledby={titleId}>
      <div className={styles.stub}>
        <span className={styles.serial} aria-hidden>
          EVENT No.{String(event.id).padStart(2, "0")}
        </span>
        <span className={styles.period}>{event.period}</span>
        {event.time && <span className={styles.time}>{event.time}</span>}
      </div>

      <div className={styles.main}>
        <div className={styles.text}>
          <h2 id={titleId} className={styles.title}>
            {event.title}
          </h2>
          <p className={styles.desc}>{event.description}</p>
        </div>
        {event.ctaHref && event.ctaLabel && (
          <Link href={event.ctaHref} className={`btn ${styles.cta}`}>
            {event.ctaLabel} <span aria-hidden>›</span>
          </Link>
        )}
      </div>
    </article>
  );
}
