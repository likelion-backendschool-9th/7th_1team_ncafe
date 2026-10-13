"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useState } from "react";
import { ORDER_COUPON_REWARD } from "../../cart/_lib/orderService";
import { useRace } from "../_hooks/useRace";
import { recentRanks } from "../_lib/records";
import type { Horse, RaceResult as Result } from "../_types";
import BetConfirmModal from "./BetConfirmModal";
import HorseCard from "./HorseCard";
import HorseTrack from "./HorseTrack";
import PayoutGuide from "./PayoutGuide";
import RaceResult from "./RaceResult";
import styles from "./race.module.css";

/**
 * 출전표 + 트랙 무대 + 결과 — BLUEPRINT 8.2 화면 구성 2~5.
 * 말을 고르면 확인창 → [사용하기] 로 쿠폰 1장을 건다. 경주는 경주 시각(RACE_TIMES)에 모두 함께 출발하고,
 * 출발 10초 전부터 끝날 때까지는 걸 수 없다(관람). 끝나면 트랙과 출전표 사이에 순위가 보이고 다음 경주 출전표가 열린다.
 * 쿠폰 정산 · 내 레이스 기록은 9단계.
 */
export default function RaceBoard({ horses, history: baseHistory }: { horses: Horse[]; history: Result[] }) {
  const { stage, history, raceNo, coupons, myBet, canBet, lock, confirmBet, lastResult, betFor } = useRace(baseHistory, horses);
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
      // 누른 카드 버튼이 사라지므로 포커스를 트랙 무대 제목으로
      requestAnimationFrame(() => document.getElementById(stageHeadingId)?.focus());
    } else if (outcome === "NO_COUPON") {
      setError("쿠폰이 부족해요. 메뉴를 주문하면 쿠폰이 적립돼요.");
    } else if (outcome === "CLOSED") {
      setError("이 경주는 마감됐어요. 다음 경주에 걸어 주세요.");
    }
  };

  // 내가 건 카드의 상태 문구 — 무대가 이 경주의 것일 때만
  const pickedLabel = stage?.raceNo === raceNo ? (stage.kind === "RUNNING" ? "경주 중" : "출발 대기 중") : "출발 대기 중";

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

      {stage && <HorseTrack horses={horses} stage={stage} headingId={stageHeadingId} />}

      {lastResult && stage?.kind !== "RUNNING" && <RaceResult result={lastResult} horses={horses} myBet={betFor(lastResult)} />}

      {!myBet && lock === "GATE_CLOSED" && (
        <p className={styles.noCoupon} role="status">
          <strong>마감</strong> — 출발 10초 전부터 경주가 끝날 때까지는 걸 수 없어요. 트랙에서 관람해 주세요.
        </p>
      )}
      {!myBet && lock === "NO_COUPON" && (
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
              picked={myBet?.horseId === horse.id}
              pickedLabel={pickedLabel}
              action={myBet ? "none" : canBet ? "pick" : "disabled"}
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
