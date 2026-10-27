"use client";

import { useState } from "react";
import { useKstToday, useRaceDayText } from "@/lib/useCountdown";
import { BRANCHES } from "../../seat/_data/branches";
import { useEvents } from "../_hooks/useEvents";
import { eventStatus, isShownOnSite, sortForSite, statusHint } from "../_lib/eventStatus";
import EventCard, { DailyRaceCard } from "./EventCard";
import styles from "./event.module.css";

/**
 * /event 목록 — 맨 위 DAILY RACE(상시 고정) + 지점 이벤트. 지점 이벤트는 진행 중이거나 운영자가 노출을 허가한 것만(사용자 결정 2026-10-14),
 * 진행 중 → 예정 → 종료 순이고 지점 필터(전체 · 마포 본점 · 강남점 · 성수점)로 거른다(사용자 결정 2026-10-27).
 * 진행 상태가 오늘 날짜(KST)에 달려 있어 시계를 읽기 전(정적 셸 · 하이드레이션 전) · 목록을 받기 전에는 자리만 보여 준다.
 * 목록 · 신청 현황은 서버 값(GET /api/v1/events)이고, 경주 일정 문구는 서버 경주 일정을 따른다.
 */
export default function EventList() {
  const { data: events, loaded, error } = useEvents();
  const today = useKstToday();
  const raceTimes = useRaceDayText() ?? "";
  const [branchId, setBranchId] = useState<string | null>(null);

  if (today === null || !loaded) {
    return (
      <ul className={styles.list} aria-busy="true">
        <li className="visually-hidden">이벤트를 불러오는 중</li>
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.skeleton} aria-hidden />
        ))}
      </ul>
    );
  }

  const shownAll = events.filter((e) => isShownOnSite(e, today));
  const shown = sortForSite(
    shownAll.filter((e) => branchId === null || e.branchId === branchId),
    today,
  );
  const filters = [
    { id: null, name: "전체", count: shownAll.length },
    ...BRANCHES.map((b) => ({ id: b.id, name: b.name, count: shownAll.filter((e) => e.branchId === b.id).length })),
  ];

  return (
    <>
      <div className={styles.filters} role="group" aria-label="지점별로 보기">
        {filters.map((f) => (
          <button
            key={f.id ?? "all"}
            type="button"
            className={styles.filter}
            aria-pressed={branchId === f.id}
            onClick={() => setBranchId(f.id)}
          >
            {f.name}
            <span className={styles.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        <li>
          <DailyRaceCard raceTimes={raceTimes} />
        </li>
        {shown.map((event) => (
          <li key={event.id}>
            <EventCard event={event} status={eventStatus(event, today)} hint={statusHint(event, today)} today={today} />
          </li>
        ))}
      </ul>

      {error ? (
        <div className={styles.empty} role="alert">
          <strong>이벤트를 불러오지 못했어요</strong>
          <p>{error.message}</p>
        </div>
      ) : (
        shown.length === 0 && (
          <div className={styles.empty}>
            <strong>{branchId === null ? "진행 중인 지점 이벤트가 없어요" : "이 지점에서 진행 중인 이벤트가 없어요"}</strong>
            <p>다음 이벤트에서 만나요. DAILY RACE 는 매일 열려요.</p>
          </div>
        )
      )}
    </>
  );
}
