"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAdminRaces, useRaceHorses } from "@/app/(site)/race/_hooks/useRaceData";
import { raceResult } from "@/app/(site)/race/_lib/records";
import { adminRacesStore } from "@/app/(site)/race/_lib/raceStores";
import { RACE_SETTLE_MS } from "@/app/(site)/race/_lib/simulation";
import type { RaceResult } from "@/app/(site)/race/_types";
import { useAuth } from "@/components/AuthProvider";
import { useNow } from "@/lib/useCountdown";
import adminStyles from "../../_components/admin.module.css";
import AdminToast, { useToast } from "../../_components/AdminToast";
import HorseAdminTable from "./HorseAdminTable";
import RaceCalendar from "./RaceCalendar";
import RaceHistoryTable from "./RaceHistoryTable";
import RaceStatusPanel from "./RaceStatusPanel";
import styles from "./raceAdmin.module.css";

/** 결과 확정을 기다리는 경주가 있을 때 관리자 목록을 다시 묻는 간격(서버 정산 스케줄러는 2초마다 돈다) */
const SETTLE_POLL_MS = 2000;

/**
 * 경주 관리 화면 — 현황 · 일정 / 출전마 / 경주 기록 세 구역을 위아래로.
 * 경주 · 출전마 · 기록은 모두 서버 값이다(GET /api/v1/admin/races · /races/horses). 추가 · 삭제 · 수정도 관리자 API 로 저장하고
 * 손님 화면(/race · 메인 · /event)은 다음에 불러올 때 같은 값을 본다. ADMIN 으로 로그인해야 쓸 수 있다.
 * 일정은 매일 같은 시각이 아니라 달력에서 날짜 · 시각을 골라 경주를 하나씩 추가 · 삭제한다(사용자 결정 2026-10-27).
 * 관리자 API 는 ADMIN 확인 뒤에만 부른다(RaceManager) — 로그인 전에 받은 401 이 로그인 뒤에도 남지 않게.
 */
export default function RaceAdmin() {
  const { member, loading } = useAuth();

  return (
    <>
      <header className={adminStyles.pageHead}>
        <div>
          <span className="eyebrow">Race Management</span>
          <h1 className={adminStyles.pageTitle}>경주 관리</h1>
          <p className="subtitle">경주 일정과 출전마를 관리하고, 지난 경주 기록을 확인합니다.</p>
        </div>
      </header>

      {member?.role === "ADMIN" ? (
        <RaceManager key={member.no} />
      ) : (
        !loading && (
          <div className={adminStyles.empty}>
            <p>{member ? "관리자 계정만 경주를 관리할 수 있어요." : "관리자 계정으로 로그인해야 경주를 관리할 수 있어요."}</p>
            <Link href={`/login?next=${encodeURIComponent("/admin/race")}`} className="btn btn-outline btn-sm">
              {member ? "다른 계정으로 로그인" : "로그인"}
            </Link>
          </div>
        )
      )}
    </>
  );
}

function RaceManager() {
  const now = useNow();
  const { data: races, loaded, error } = useAdminRaces();
  const horses = useRaceHorses().data;
  const { toast, show } = useToast();
  const history = races.map(raceResult).filter((r): r is RaceResult => r !== null);

  // 들어올 때마다(다른 관리자로 다시 로그인한 경우 포함) 새로 불러온다
  useEffect(() => {
    void adminRacesStore.refresh();
  }, []);

  // 출발했는데 아직 정산 전인 경주가 있으면 결과가 나올 때까지 목록을 자주 다시 불러온다
  const waiting = now !== null && races.some((r) => r.status === "SCHEDULED" && now >= r.startsAt + RACE_SETTLE_MS);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void adminRacesStore.refresh(), SETTLE_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting]);

  return (
    <>
      <nav className={styles.subnav} aria-label="경주 관리 바로가기">
        <a href="#race-status">현황 · 일정</a>
        <a href="#race-horses">출전마</a>
        <a href="#race-history">경주 기록</a>
      </nav>
      <p className={styles.syncNote}>변경 내용은 서버에 저장되어 손님 화면(/race · 메인 · /event)에도 반영돼요.</p>
      {error && (
        <p className={adminStyles.error} role="alert">
          경주 목록을 불러오지 못했어요 — {error.message}
        </p>
      )}

      <section id="race-status" className={styles.section} aria-labelledby="race-status-title">
        <div className={styles.sectionHead}>
          <h2 id="race-status-title" className={styles.sectionTitle}>
            현황 · 일정
          </h2>
          <p className={styles.sectionDesc}>경주마다 날짜와 출발 시각을 정해요. 그 시각에 모든 손님이 같은 경주를 함께 봐요.</p>
        </div>
        <RaceStatusPanel now={now} loaded={loaded} races={races} horses={horses} />
        <RaceCalendar now={now} loaded={loaded} races={races} horses={horses} show={show} />
      </section>

      <section id="race-horses" className={styles.section} aria-labelledby="race-horses-title">
        <div className={styles.sectionHead}>
          <h2 id="race-horses-title" className={styles.sectionTitle}>
            출전마
          </h2>
          <p className={styles.sectionDesc}>7마리 고정 · 주행 성향은 아직 마감 전인 경주부터 결과에 반영돼요.</p>
        </div>
        <HorseAdminTable horses={horses} history={history} show={show} />
      </section>

      <section id="race-history" className={styles.section} aria-labelledby="race-history-title">
        <div className={styles.sectionHead}>
          <h2 id="race-history-title" className={styles.sectionTitle}>
            경주 기록
          </h2>
          <p className={styles.sectionDesc}>끝난 경주의 1~7위 · 게이트 번호는 그 경주 당시 번호예요.</p>
        </div>
        <RaceHistoryTable races={races} horses={horses} />
      </section>

      <AdminToast toast={toast} />
    </>
  );
}
