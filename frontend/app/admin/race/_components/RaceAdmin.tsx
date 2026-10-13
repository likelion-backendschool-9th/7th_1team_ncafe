"use client";

import { useRaceHistory } from "@/app/(site)/race/_hooks/useRace";
import { useRaceHorses } from "@/app/(site)/race/_hooks/useRaceHorses";
import type { Horse, RaceResult } from "@/app/(site)/race/_types";
import adminStyles from "../../_components/admin.module.css";
import AdminToast, { useToast } from "../../_components/AdminToast";
import HorseAdminTable from "./HorseAdminTable";
import RaceHistoryTable from "./RaceHistoryTable";
import RaceStatusPanel from "./RaceStatusPanel";
import ScheduleEditor from "./ScheduleEditor";
import styles from "./raceAdmin.module.css";

/**
 * 경주 관리 화면 — 현황 · 시간표 / 출전마 / 경주 기록 세 구역을 위아래로.
 * 기록 · 번호는 /race 와 같은 계산(useRaceHistory), 출전마 · 시간표는 같은 저장소(같은 브라우저 손님 화면에 바로 반영 — 사용자 결정 2026-10-14).
 */
export default function RaceAdmin({ horses: serverHorses, history: baseHistory }: { horses: Horse[]; history: RaceResult[] }) {
  const horses = useRaceHorses(serverHorses);
  const { history, now } = useRaceHistory(baseHistory);
  const { toast, show } = useToast();

  return (
    <>
      <header className={adminStyles.pageHead}>
        <div>
          <span className="eyebrow">Race Management</span>
          <h1 className={adminStyles.pageTitle}>경주 관리</h1>
          <p className="subtitle">경주 시간표와 출전마를 관리하고, 지난 경주 기록을 확인합니다.</p>
        </div>
      </header>

      <nav className={styles.subnav} aria-label="경주 관리 바로가기">
        <a href="#race-status">현황 · 시간표</a>
        <a href="#race-horses">출전마</a>
        <a href="#race-history">경주 기록</a>
      </nav>
      <p className={styles.syncNote}>
        변경 내용은 이 브라우저에 저장되어 같은 브라우저의 손님 화면(/race · 메인 · /event)에 바로 반영돼요.
      </p>

      <section id="race-status" className={styles.section} aria-labelledby="race-status-title">
        <div className={styles.sectionHead}>
          <h2 id="race-status-title" className={styles.sectionTitle}>
            현황 · 시간표
          </h2>
        </div>
        <RaceStatusPanel now={now} history={history} horses={horses} />
        <ScheduleEditor show={show} />
      </section>

      <section id="race-horses" className={styles.section} aria-labelledby="race-horses-title">
        <div className={styles.sectionHead}>
          <h2 id="race-horses-title" className={styles.sectionTitle}>
            출전마
          </h2>
          <p className={styles.sectionDesc}>7마리 고정 · 주행 성향은 바꾼 뒤의 경주부터 결과에 반영돼요.</p>
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
        <RaceHistoryTable history={history} horses={horses} />
      </section>

      <AdminToast toast={toast} />
    </>
  );
}
