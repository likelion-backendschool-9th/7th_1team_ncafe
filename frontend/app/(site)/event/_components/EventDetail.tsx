"use client";

import Link from "next/link";
import HorseAvatar from "@/components/HorseAvatar";
import layout from "@/components/layout.module.css";
import { useKstToday, useRaceDayText } from "@/lib/useCountdown";
import { useEvents } from "../_hooks/useEvents";
import { eventStatus, eventTimeText, formatEventPeriod, isShownOnSite, statusHint } from "../_lib/eventStatus";
import { EventStatusChip } from "./EventCard";
import styles from "./event.module.css";

/**
 * 이벤트 상세 — /event/[id]. 목록 티켓을 크게 펼친 머리 + 참여 방법 · 유의 사항 + 이동 버튼.
 * 손님 화면에 보이는 이벤트(진행 중 · 노출 허가)만 연다 — 그 밖(없는 id · 예정/종료인데 노출 허가 없음)은 안내 상자.
 * 이벤트는 관리자 변경(같은 브라우저)을 따르므로 클라이언트에서 그린다. 시계를 읽기 전에는 스켈레톤.
 */
export default function EventDetail({ id }: { id: number | null }) {
  const events = useEvents();
  const today = useKstToday();
  const raceTimes = useRaceDayText() ?? "";

  if (today === null) return <EventDetailSkeleton />;

  const event = id === null ? null : (events.find((e) => e.id === id) ?? null);
  if (!event || !isShownOnSite(event, today)) return <EventUnavailable />;

  const status = eventStatus(event, today);
  const timeText = eventTimeText(event, raceTimes);
  const showCta = Boolean(event.ctaHref && event.ctaLabel) && status !== "ENDED";

  return (
    <>
      <nav className={styles.crumbs} aria-label="현재 위치">
        <Link href="/event">이벤트</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">{event.title}</span>
      </nav>

      <article aria-labelledby="event-headline">
        <header className={`${styles.ticket} ${styles.ticketLg} ${status === "ENDED" ? styles.ticketEnded : ""}`}>
          <div className={styles.stub}>
            <span className={styles.serial} aria-hidden>
              EVENT No.{String(event.id).padStart(2, "0")}
            </span>
            <span className={styles.period}>{event.period}</span>
            {timeText && <span className={styles.time}>{timeText}</span>}
            <EventStatusChip status={status} hint={statusHint(event, today)} />
          </div>
          <div className={styles.main}>
            <div className={styles.text}>
              <span className="eyebrow">Race Event</span>
              <h1 id="event-headline" className={styles.headline}>
                {event.title}
              </h1>
              <p className={styles.dates}>
                <span className="visually-hidden">기간 </span>
                {formatEventPeriod(event)}
              </p>
              <p className={styles.desc}>{event.description}</p>
            </div>
            {showCta && (
              <Link href={event.ctaHref!} className={`btn ${styles.cta}`}>
                {event.ctaLabel} <span aria-hidden>›</span>
              </Link>
            )}
          </div>
        </header>

        <div className={styles.detailGrid}>
          <section className={styles.detailBox} aria-labelledby="event-steps">
            <div className={styles.detailBoxHead}>
              <span className={styles.detailEyebrow}>HOW TO JOIN</span>
              <h2 id="event-steps" className={styles.detailTitle}>
                참여 방법
              </h2>
            </div>
            {event.steps.length ? (
              <ol className={styles.steps}>
                {event.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className={styles.boxEmpty}>따로 참여할 필요 없이 자동으로 적용돼요.</p>
            )}
          </section>

          <section className={styles.detailBox} aria-labelledby="event-notes">
            <div className={styles.detailBoxHead}>
              <span className={styles.detailEyebrow}>NOTICE</span>
              <h2 id="event-notes" className={styles.detailTitle}>
                유의 사항
              </h2>
            </div>
            {event.notes.length ? (
              <ul className={styles.notes}>
                {event.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.boxEmpty}>안내할 유의 사항이 없어요.</p>
            )}
          </section>
        </div>

        <div className={styles.detailFoot}>
          <Link href="/event" className="btn btn-outline">
            <span aria-hidden>←</span> 이벤트 목록
          </Link>
          {showCta && (
            <Link href={event.ctaHref!} className="btn">
              {event.ctaLabel} <span aria-hidden>›</span>
            </Link>
          )}
        </div>
      </article>
    </>
  );
}

/** 시계를 읽기 전 · 주소를 읽는 동안(Suspense) — 같은 틀의 빈 자리 */
export function EventDetailSkeleton() {
  return (
    <div aria-busy="true">
      <span className="visually-hidden">이벤트를 불러오는 중</span>
      <div className={styles.skeleton} style={{ minHeight: 200 }} aria-hidden />
      <div className={styles.detailGrid} aria-hidden>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    </div>
  );
}

/** 없는 이벤트 · 지금은 손님에게 보이지 않는 이벤트 — 메뉴의 SCRATCHED 와 같은 안내 상자 */
function EventUnavailable() {
  return (
    <div className={layout.soon}>
      <span className="eyebrow">Race Event</span>
      <h1 className="title-xl">CLOSED</h1>
      <HorseAvatar color="#5e5e65" number={7} emblem="🎟" size={130} />
      <p>
        <strong>지금은 볼 수 없는 이벤트예요.</strong> 이벤트가 끝났거나 아직 공개되지 않았어요.
      </p>
      <Link href="/event" className="btn">
        진행 중인 이벤트 보기
      </Link>
    </div>
  );
}
