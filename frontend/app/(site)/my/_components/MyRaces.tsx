"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/components/UserProvider";
import { formatRaceDate } from "@/lib/time";
import type { RaceEntry } from "@/types/common";
import { useRaceHorses } from "../../race/_hooks/useRaceHorses";
import type { Horse } from "../../race/_types";
import { useShowMore } from "../_hooks/useShowMore";
import { SectionEmpty, SectionHead, ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 5;

/**
 * 내 레이스 기록 — 쿠폰을 건 경주, 최신순. 처음엔 최근 5경주, "전체 보기"로 나머지를 펼친다.
 * 한 줄 = 경주 STUB(번호 · 출발 시각) ┊ 고른 말 · 돌려받은 쿠폰 ┊ 순위. 정산은 경주가 끝나면 어느 페이지에서든 되므로
 * 결과 전에는 "결과 대기"로 보이다가 바로 바뀐다. 말 정보는 page 가 레이스 Service 에서 받아 넘기고, 관리자 변경을 겹친다(useRaceHorses).
 */
export default function MyRaces({ horses: serverHorses }: { horses: Horse[] }) {
  const horses = useRaceHorses(serverHorses);
  const { races } = useUser();
  const { visible, expanded, hasMore, total, toggle } = useShowMore(races, PREVIEW);

  return (
    <section id="races" className={styles.section} aria-labelledby="races-title">
      <SectionHead id="races" label="MY RACES" title="내 레이스 기록" meta={`${races.length}경주`} />

      {races.length === 0 ? (
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
