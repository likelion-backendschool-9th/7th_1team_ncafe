"use client";

import { useKstToday } from "@/lib/useCountdown";
import { formatRaceTimes } from "@/lib/time";
import { useRaceTimes } from "@/lib/useRaceTimes";
import { useEvents } from "../_hooks/useEvents";
import { eventStatus, eventTimeText, isShownOnSite, sortForSite, statusHint } from "../_lib/eventStatus";
import EventCard from "./EventCard";
import styles from "./event.module.css";

/**
 * /event 목록 — 진행 중이거나 운영자가 노출을 허가한 이벤트만(사용자 결정 2026-10-14), 진행 중 → 예정 → 종료 순.
 * 진행 상태가 오늘 날짜(KST)에 달려 있어 시계를 읽기 전(정적 셸 · 하이드레이션 전)에는 자리만 보여 준다.
 * 목록 · 경주 시각은 관리자 변경(같은 브라우저)을 따른다.
 */
export default function EventList() {
  const events = useEvents();
  const today = useKstToday();
  const raceTimes = formatRaceTimes(useRaceTimes());

  if (today === null) {
    return (
      <ul className={styles.list} aria-busy="true">
        <li className="visually-hidden">이벤트를 불러오는 중</li>
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.skeleton} aria-hidden />
        ))}
      </ul>
    );
  }

  const shown = sortForSite(
    events.filter((e) => isShownOnSite(e, today)),
    today,
  );

  if (shown.length === 0) {
    return (
      <div className={styles.empty}>
        <strong>진행 중인 이벤트가 없어요</strong>
        <p>다음 이벤트에서 만나요.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {shown.map((event) => (
        <li key={event.id}>
          <EventCard
            event={event}
            status={eventStatus(event, today)}
            hint={statusHint(event, today)}
            timeText={eventTimeText(event, raceTimes)}
          />
        </li>
      ))}
    </ul>
  );
}
