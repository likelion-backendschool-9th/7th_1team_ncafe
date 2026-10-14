"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ConditionMeter from "@/components/ConditionMeter";
import { useHorseConditions } from "../race/_hooks/useHorseConditions";
import { useRaceHistory } from "../race/_hooks/useRace";
import { useRaceHorses } from "../race/_hooks/useRaceHorses";
import { byGate, gatesFor, nextRaceNo, recentRanks, TRAIT_LABEL } from "../race/_lib/records";
import type { Horse, HorseCondition, RaceResult } from "../race/_types";
// 섹션 머리(제목 · 설명 · 더 보기)는 TODAY'S LINEUP 과 같은 클래스를 쓴다
import head from "./menuLineup.module.css";
import styles from "./runnerStatus.module.css";

/**
 * 메인 "TODAY'S RUNNERS" — 다음 경주 출전마 7마리의 오늘 상태를 가로 슬라이더 텍스트 카드로(게이트 순).
 * 카드: 위쪽 말 이미지(옅은 조끼색 바탕) · 아래 왼쪽 조끼색 세로 막대 · 게이트 번호 · 성향 · 이름 · 오늘의 컨디션(막대 20칸 게이지) · 최근 성적.
 * 누르면 /race 출전표로.
 * 게이트 · 최근 성적은 /race 와 같은 기록(useRaceHistory — 지나간 경주 자동 보충)에서, 컨디션은 useHorseConditions 에서 온다.
 * PC 는 좌우 화살표, 모바일은 밀어서 넘긴다.
 */
export default function RunnerStatus({ horses: serverHorses, history: baseHistory }: { horses: Horse[]; history: RaceResult[] }) {
  const horses = useRaceHorses(serverHorses);
  const { history } = useRaceHistory(baseHistory);
  const conditions = useHorseConditions();
  const raceNo = nextRaceNo(history);
  const gates = useMemo(() => gatesFor(raceNo, history, horses), [raceNo, history, horses]);

  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  // 화살표는 넘길 곳이 있을 때만 — 스크롤 · 크기 변화 때 다시 잰다(ResizeObserver 는 처음 붙일 때도 한 번 부른다)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const start = el.scrollLeft <= 4;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);

  const slide = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <section className={`container ${head.section}`} aria-labelledby="runners-title">
      <div className={head.head}>
        <div>
          <h2 id="runners-title" className={head.title}>
            TODAY&apos;S RUNNERS
          </h2>
          <p className={head.subtitle}>
            오늘의 컨디션 — 다음 경주 Race #{raceNo}에 나설 {horses.length}마리예요.
          </p>
        </div>
        <Link href="/race" className={head.more}>
          출전표 보기 <span aria-hidden>›</span>
        </Link>
      </div>

      <div className={styles.slider}>
        <ul ref={track} className={styles.track}>
          {/* key 는 게이트 자리 — 마운트 뒤 기록을 보충하며 게이트 순서가 바뀌어도 칸(li)은 제자리에 두고 내용만 바꾼다.
              말 id 로 두면 li 가 옮겨지고, 스크롤 스냅이 처음 붙어 있던 칸을 따라가 슬라이더가 끝으로 밀려 버린다 */}
          {byGate(horses, gates).map((horse) => (
            <li key={gates[horse.id]}>
              <RunnerCard horse={horse} gate={gates[horse.id]} recent={recentRanks(history, horse.id)} condition={conditions?.[horse.id] ?? null} />
            </li>
          ))}
        </ul>
        {!edges.start && (
          <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} onClick={() => slide(-1)} aria-label="이전 말 보기">
            <Chevron />
          </button>
        )}
        {!edges.end && (
          <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} onClick={() => slide(1)} aria-label="다음 말 보기">
            <Chevron />
          </button>
        )}
      </div>
    </section>
  );
}

function RunnerCard({
  horse,
  gate,
  recent,
  condition,
}: {
  horse: Horse;
  gate: number;
  recent: number[];
  condition: HorseCondition | null;
}) {
  return (
    <Link href="/race" className={styles.card}>
      {/* 위쪽 이미지 칸 — 그 말의 조끼색을 아주 옅게 깔고 카드 위 가장자리까지 채운다 */}
      <span className={styles.photo} style={{ background: `color-mix(in srgb, ${horse.color} 14%, #fff)` }}>
        <Image src={horse.image} alt="" width={420} height={300} sizes="220px" className={styles.photoImg} />
      </span>
      <span className={styles.info}>
        <span
          className={styles.bar}
          style={{ background: `linear-gradient(to top, ${horse.color}, color-mix(in srgb, ${horse.color} 22%, #fff))` }}
          aria-hidden
        />
        <span className={styles.body}>
          <span className={styles.meta}>
            {gate}번 게이트 · {TRAIT_LABEL[horse.trait]}
          </span>
          <strong className={styles.name}>
            {horse.name.toUpperCase()} <span className={styles.nameKo}>{horse.nameKo}</span>
          </strong>
          <span className={styles.condition}>
            <ConditionMeter condition={condition} caption="컨디션" />
          </span>
          <span className={styles.recent}>
            <span className={styles.label}>최근</span>
            {recent.length === 0 ? (
              <span className={styles.none}>기록 없음</span>
            ) : (
              <>
                <span className={styles.ranks} aria-hidden>
                  {recent.map((rank, i) => (
                    <span key={i} className={rank === 1 ? styles.rankWin : undefined}>
                      {rank}
                      <small>위</small>
                    </span>
                  ))}
                </span>
                <span className="visually-hidden">최근 경기부터 {recent.map((r) => `${r}위`).join(", ")}</span>
              </>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
