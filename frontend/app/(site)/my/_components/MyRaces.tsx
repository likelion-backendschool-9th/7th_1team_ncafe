"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { formatRaceDate } from "@/lib/time";
import type { RaceEntry } from "@/types/common";
import { useMyBets, useRaceHorses } from "../../race/_hooks/useRaceData";
import type { Horse } from "../../race/_types";
import { useShowMore } from "../_hooks/useShowMore";
import { SectionEmpty, SectionHead, ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 5;
const LOGIN_HREF = `/login?next=${encodeURIComponent("/my#races")}`;

/**
 * 내 레이스 기록 — 쿠폰을 건 경주, 최신순. 처음엔 최근 5경주, "전체 보기"로 나머지를 펼친다.
 * 한 줄 = 경주 STUB(번호 · 출발 시각) ┊ 고른 말 · 돌려받은 쿠폰 ┊ 순위. 기록 · 말 정보는 서버 값이고(GET /api/v1/races/bets/me · /races/horses),
 * 정산은 서버가 하므로 결과 전에는 "결과 대기"로 보이다가 RaceSettlement 가 다시 불러오면 바뀐다. 로그인하지 않았으면 로그인 안내.
 */
export default function MyRaces() {
  const { member, loaded: authLoaded } = useAuth();
  const horses = useRaceHorses().data;
  const { data: races, loaded } = useMyBets();
  const { visible, expanded, hasMore, total, toggle } = useShowMore(races, PREVIEW);

  return (
    <section id="races" className={styles.section} aria-labelledby="races-title">
      <SectionHead id="races" label="MY RACES" title="내 레이스 기록" meta={member && loaded ? `${races.length}경주` : ""} />

      {authLoaded && !member ? (
        <SectionEmpty
          title="로그인하면 내 레이스 기록이 보여요"
          action={
            <Link href={LOGIN_HREF} className="btn btn-outline btn-sm">
              로그인
            </Link>
          }
        >
          쿠폰을 건 경주와 고른 말, 순위, 돌려받은 쿠폰이 회원 계정에 기록돼요.
        </SectionEmpty>
      ) : !member || !loaded ? null : races.length === 0 ? (
        <SectionEmpty
          title="아직 참여한 레이스가 없어요"
          action={
            <Link href="/race" className="btn btn-outline btn-sm">
              출전표 보기
            </Link>
          }
        >
          출전표에서 말을 골라 쿠폰을 걸면 고른 말과 순위, 돌려받은 쿠폰이 여기에 기록돼요.
        </SectionEmpty>
      ) : (
        <>
          <ol id="races-list" className={styles.raceList}>
            {visible.map((entry) => (
              <RaceRow key={entry.raceNo} entry={entry} horse={horses.find((h) => h.id === entry.horseId) ?? null} />
            ))}
          </ol>
          {hasMore && <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="races-list" />}
        </>
      )}
    </section>
  );
}

function RaceRow({ entry, horse }: { entry: RaceEntry; horse: Horse | null }) {
  const settled = entry.settledAt !== null && entry.rank !== null;
  const top = settled && entry.rank !== null && entry.rank <= 3;
  const name = horse?.name.toUpperCase() ?? `${entry.horseId}번 말`;

  return (
    <li className={styles.raceRow}>
      <div className={styles.raceStub}>
        <span className={styles.raceNo}>RACE #{entry.raceNo}</span>
        <time className={styles.raceAt} dateTime={entry.startsAt}>
          {formatRaceDate(entry.startsAt)}
        </time>
      </div>

      <div className={styles.raceBody}>
        {horse && <Image src={horse.image} alt="" width={84} height={60} className={styles.raceThumb} />}
        <div className={styles.raceText}>
          <span className={styles.raceHorse}>
            {entry.gate}번 {name}
            {horse && <small>{horse.nameKo}</small>}
          </span>
          <span className={styles.racePayout}>
            {!settled ? "경주가 끝나면 결과가 기록돼요" : entry.payout > 0 ? `쿠폰 ${entry.payout}장 돌려받음` : "돌려받은 쿠폰 없음"}
          </span>
        </div>
      </div>

      <div className={styles.raceResult}>
        {settled ? (
          <strong className={`${styles.raceRank} ${top ? styles.raceRankTop : ""}`}>
            {entry.rank}
            <small>위</small>
          </strong>
        ) : (
          <span className={styles.racePending}>결과 대기</span>
        )}
      </div>
    </li>
  );
}
