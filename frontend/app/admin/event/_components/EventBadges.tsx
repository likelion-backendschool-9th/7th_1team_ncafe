import { EVENT_STATUS_LABEL } from "@/app/(site)/event/_lib/eventStatus";
import type { CafeEvent, EventStatus } from "@/app/(site)/event/_types";
import styles from "./eventAdmin.module.css";

/** 관리자 상태 표시 — 상태 알약(색 + 글자) + 자동/수동 + D-day */
export function StatusBadges({ event, status, hint }: { event: CafeEvent; status: EventStatus; hint: string }) {
  return (
    <span className={styles.badges}>
      <span className={`${styles.status} ${styles[`status_${status}`]}`}>{EVENT_STATUS_LABEL[status]}</span>
      <span className={event.status ? styles.modeManual : styles.modeAuto}>{event.status ? "수동" : "자동"}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </span>
  );
}

/** 손님 화면에 보이는지 — 보임(진행 중 · 노출 허가) / 숨김 */
export function SiteBadge({ shown, status }: { shown: boolean; status: EventStatus }) {
  return (
    <span className={shown ? styles.siteShown : styles.siteHidden}>
      {shown ? (status === "ONGOING" ? "● 보임 · 진행 중" : "● 보임 · 노출 허가") : "○ 숨김"}
    </span>
  );
}
