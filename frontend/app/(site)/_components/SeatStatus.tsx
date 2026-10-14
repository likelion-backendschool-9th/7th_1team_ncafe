"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { formatKstTime, kstDate } from "@/lib/kst";
import type { SeatReservation } from "@/types/common";
import { useMinuteClock } from "../seat/_hooks/useMinuteClock";
import { getBranchOccupancy } from "../seat/_lib/seatService";
import type { Branch, BranchOccupancy, SlotAvailability } from "../seat/_types";
// 섹션 머리(제목 · 설명 · 더 보기)는 TODAY'S LINEUP 과 같은 클래스를 쓴다
import head from "./menuLineup.module.css";
import styles from "./seatStatus.module.css";

type Crowd = "LOW" | "MID" | "HIGH";

const CROWD_LABEL: Record<Crowd, string> = { LOW: "여유", MID: "보통", HIGH: "혼잡" };
const MESSAGE_NOW: Record<Crowd, string> = {
  LOW: "지금 바로 앉을 자리가 넉넉해요.",
  MID: "자리가 적당히 남아 있어요.",
  HIGH: "자리가 얼마 남지 않았어요. 미리 예약해 두세요.",
};
const MESSAGE_FIRST: Record<Crowd, string> = {
  LOW: "첫 시간대는 자리가 넉넉해요.",
  MID: "첫 시간대는 자리가 적당히 남아 있어요.",
  HIGH: "첫 시간대도 벌써 붐벼요. 미리 예약해 두세요.",
};

/** 시간대 막대 아래 눈금 — 13칸(09~21시) 중 3시간마다 */
const AXIS = ["09", "12", "15", "18", "21"];

/** 점유율 → 혼잡도. 기준은 Mock 분포(지점 3곳 × 13칸 × 1주)에서 여유 ≈ 1/3 · 혼잡 ≈ 1/6 이 되도록 잡았다 */
function crowdOf(rate: number): Crowd {
  return rate >= 0.7 ? "HIGH" : rate >= 0.45 ? "MID" : "LOW";
}

function rateOf(slot: { available: number; total: number }): number {
  return slot.total === 0 ? 0 : 1 - slot.available / slot.total;
}

/** 내 예약만큼 잔여석을 뺀다 — /seat 의 시간대 카드와 같은 숫자가 되게 */
function withMine(item: BranchOccupancy, date: string, mine: SeatReservation[]): SlotAvailability[] {
  return item.slots.map((s) => {
    const taken = mine
      .filter((r) => r.kind === "RESERVED" && r.branchId === item.branch.id && r.date === date && r.start === s.start)
      .reduce((n, r) => n + r.chairIds.length, 0);
    return { ...s, available: Math.max(0, s.available - taken) };
  });
}

interface BranchCard {
  branch: Branch;
  slots: SlotAvailability[];
  current: SlotAvailability | null; // 기준 시간대 — 진행 중인 시간대, 없으면 아직 오지 않은 첫 시간대
}

/**
 * 메인 "SEAT STATUS" — 지점별 좌석 현황 카드(PC 3열 · 모바일 1열). 지금 여유로운 지점부터.
 * 카드: 순위 · 혼잡도 배지(신호등 3색) · 빈 의자 / 전체 · 점유율 막대 · 안내 한 줄 · 그 날 시간대별 막대 13칸 · [이 지점 좌석 예약].
 * 기준 시간대는 지금 진행 중인 1시간 블록 — 오픈 전이면 09:00 블록, 영업이 끝났으면 내일 09:00 블록.
 * 시각을 알기 전(정적 셸)에는 지점 이름만 있는 빈 카드를 그리고, 1분마다 다시 받는다.
 */
export default function SeatStatus({ branches }: { branches: Branch[] }) {
  const { seatReservations } = useUser();
  const now = useMinuteClock();
  const [data, setData] = useState<{ at: number; date: string; branches: BranchOccupancy[] } | null>(null);

  useEffect(() => {
    if (now === null) return;
    let alive = true;
    getBranchOccupancy(now).then((res) => {
      if (alive) setData({ at: now, ...res });
    });
    return () => {
      alive = false;
    };
  }, [now]);

  const cards: BranchCard[] = useMemo(() => {
    if (!data) return branches.map((branch) => ({ branch, slots: [], current: null }));
    const list = data.branches.map((item) => {
      const slots = withMine(item, data.date, seatReservations);
      const current = slots.find((s) => s.state === "LIVE") ?? slots.find((s) => s.state === "OPEN") ?? null;
      return { branch: item.branch, slots, current };
    });
    // 여유로운 순 — 기준 시간대의 빈 의자 비율이 높은 지점부터(같으면 원래 순서)
    return list.sort((a, b) => (a.current ? rateOf(a.current) : 1) - (b.current ? rateOf(b.current) : 1));
  }, [data, branches, seatReservations]);

  const today = now === null ? null : kstDate(now);
  const isTomorrow = data !== null && today !== null && data.date !== today;
  const updatedAt = data ? formatKstTime(data.at) : null;

  return (
    <section className={`container ${head.section}`} aria-labelledby="seat-status-title">
      <div className={head.head}>
        <div>
          <h2 id="seat-status-title" className={head.title}>
            SEAT STATUS
          </h2>
          <p className={head.subtitle}>지점별 좌석 현황 — 지금 여유로운 지점부터 보여 드려요.</p>
        </div>
        <Link href="/seat" className={head.more}>
          좌석 예약하기 <span aria-hidden>›</span>
        </Link>
      </div>

      <ol className={styles.grid}>
        {cards.map((card, i) => (
          <li key={card.branch.id}>
            <BranchStatusCard card={card} rank={data ? i + 1 : null} isTomorrow={isTomorrow} updatedAt={updatedAt} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function BranchStatusCard({
  card,
  rank,
  isTomorrow,
  updatedAt,
}: {
  card: BranchCard;
  rank: number | null;
  isTomorrow: boolean;
  updatedAt: string | null;
}) {
  const { branch, slots, current } = card;
  const rate = current ? rateOf(current) : null;
  const crowd = rate === null ? null : crowdOf(rate);
  const percent = rate === null ? null : Math.round(rate * 100);
  const live = current?.state === "LIVE";

  const basis = !current
    ? "좌석 현황을 불러오는 중…"
    : `${live ? "지금" : isTomorrow ? "영업 종료 · 내일" : "오픈 전 ·"} ${current.start}–${current.end} 기준${updatedAt ? ` · ${updatedAt} 업데이트` : ""}`;

  return (
    <article className={styles.card} aria-labelledby={`seat-${branch.id}`}>
      <div className={styles.top}>
        <span className={styles.rank} aria-hidden>
          {rank}
        </span>
        <span className={styles.pill} data-crowd={crowd ?? undefined}>
          {crowd ? CROWD_LABEL[crowd] : "확인 중"}
        </span>
      </div>

      <div>
        <h3 id={`seat-${branch.id}`} className={styles.name}>
          {rank !== null && <span className="visually-hidden">여유 {rank}위 </span>}
          {branch.name}
        </h3>
        <p className={styles.address}>{branch.address}</p>
      </div>

      <div className={styles.stat}>
        <p>
          빈 의자 <strong>{current ? current.available : "—"}</strong> / {current ? current.total : "—"}석
        </p>
        <span className={styles.rate}>점유 {percent ?? "—"}%</span>
      </div>
      <div className={styles.meter} aria-hidden>
        <span data-crowd={crowd ?? undefined} style={{ width: `${percent ?? 0}%` }} />
      </div>

      <p className={styles.message}>{crowd ? (live ? MESSAGE_NOW : MESSAGE_FIRST)[crowd] : " "}</p>

      <div className={styles.hours}>
        <p className={styles.hoursTitle}>{isTomorrow ? "내일" : "오늘"} 시간대별 혼잡도</p>
        <ol className={styles.bars} aria-label={`${isTomorrow ? "내일" : "오늘"} 시간대별 점유율`}>
          {slots.map((s) => {
            const r = rateOf(s);
            const c = crowdOf(r);
            const isCurrent = s.start === current?.start;
            return (
              <li key={s.start} data-crowd={c} data-past={s.state === "CLOSED" || undefined} data-current={isCurrent || undefined}>
                <i style={{ height: `${Math.max(10, Math.round(r * 100))}%` }} />
                <span className="visually-hidden">
                  {s.start} {Math.round(r * 100)}% {CROWD_LABEL[c]}
                  {isCurrent ? " (기준)" : s.state === "CLOSED" ? " (지남)" : ""}
                </span>
              </li>
            );
          })}
        </ol>
        <div className={styles.axis} aria-hidden>
          {AXIS.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </div>

      <p className={styles.basis}>{basis}</p>

      <Link href={`/seat?branch=${branch.id}`} className={`btn btn-sm ${styles.cta}`}>
        이 지점 좌석 예약 <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
