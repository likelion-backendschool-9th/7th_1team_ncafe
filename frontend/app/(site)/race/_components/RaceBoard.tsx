"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useState } from "react";
import { ORDER_COUPON_REWARD } from "../../cart/_lib/orderService";
import { useRace } from "../_hooks/useRace";
import { recentRanks } from "../_lib/records";
import type { Horse, RacePhase, RaceResult } from "../_types";
import BetConfirmModal from "./BetConfirmModal";
import HorseCard from "./HorseCard";
import HorseTrack from "./HorseTrack";
import PayoutGuide from "./PayoutGuide";
import styles from "./race.module.css";

/** 내가 건 카드의 상태 문구 */
const PICKED_LABEL: Record<Exclude<RacePhase, "BETTING">, string> = {
  READY: "출발 대기 중",
  RUNNING: "경주 중",
  FINISHED: "경주 종료",
};

/**
 * 출전표(BETTING) · 트랙(READY → RUNNING → FINISHED) — BLUEPRINT 8.2 화면 구성 2~4.
 * 말을 고르면 확인창 → [사용하기] 로 쿠폰 1장을 걸고 READY 로 넘어간다. 걸고 나면 다른 말은 고를 수 없고,
 * 출전표 위에 트랙이 붙어 [경주 시작] 으로 출발한다. 결과 · 정산(FINISHED)은 9단계.
 */
export default function RaceBoard({ horses, history: baseHistory }: { horses: Horse[]; history: RaceResult[] }) {
  const { phase, bet, history, raceNo, coupons, canBet, confirmBet, startRace } = useRace(baseHistory);
  const [selected, setSelected] = useState<Horse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stageHeadingId = useId();

  // 다른 페이지로 가면 이 화면은 언마운트되지 않고 <Activity> 로 숨는다 — 열려 있던 확인창은 닫아 둔다(8.9 Activity 주의).
  useLayoutEffect(() => {
    return () => {
      setSelected(null);
      setError("");
    };
  }, []);

  const pickedHorse = bet ? horses.find((h) => h.id === bet.horseId) ?? null : null;

  const open = (horse: Horse) => {
    setError("");
    setSelected(horse);
  };

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    const outcome = await confirmBet(selected);
    setBusy(false);
    if (outcome === "OK") {
      setSelected(null);
      // 누른 카드 버튼이 사라지므로 포커스를 트랙 머리띠 제목으로
      requestAnimationFrame(() => document.getElementById(stageHeadingId)?.focus());
    } else if (outcome === "NO_COUPON") {
      setError("쿠폰이 부족해요. 메뉴를 주문하면 쿠폰이 적립돼요.");
    } else if (outcome === "CLOSED") {
      setSelected(null);
    }
  };

  return (
    <section className={styles.lineup} aria-labelledby="lineup-title">
      <div className={styles.lineupHead}>
        <div>
          <span className={styles.lineupEyebrow}>Today&apos;s Runners</span>
          <h2 id="lineup-title" className={styles.lineupTitle}>
            출전표 <span className={styles.lineupRace}>Race #{raceNo}</span>
          </h2>
        </div>
        <PayoutGuide />
      </div>

      {phase !== "BETTING" && pickedHorse && (
        <HorseTrack
          horses={horses}
          raceNo={raceNo}
          myHorse={pickedHorse}
          phase={phase}
          headingId={stageHeadingId}
          onStart={() => startRace(horses)}
        />
      )}

      {phase === "BETTING" && !canBet && (
        <p className={styles.noCoupon} role="status">
          <strong>쿠폰이 부족합니다</strong> — 메뉴를 주문하면 {ORDER_COUPON_REWARD}장 적립돼요.
          <Link href="/menu" className={styles.noCouponLink}>
            메뉴 보러 가기 <span aria-hidden>›</span>
          </Link>
        </p>
      )}

      <ul className={styles.cards}>
        {horses.map((horse) => (
          <li key={horse.id}>
            <HorseCard
              horse={horse}
              recent={recentRanks(history, horse.id)}
              picked={bet?.horseId === horse.id}
              pickedLabel={phase === "BETTING" ? "" : PICKED_LABEL[phase]}
              action={phase !== "BETTING" ? "none" : canBet ? "pick" : "disabled"}
              onPick={() => open(horse)}
            />
          </li>
        ))}
      </ul>

      <BetConfirmModal
        horse={selected}
        raceNo={raceNo}
        coupons={coupons}
        busy={busy}
        error={error}
        onCancel={() => !busy && setSelected(null)}
        onConfirm={confirm}
      />
    </section>
  );
}
