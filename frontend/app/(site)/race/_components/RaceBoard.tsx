"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useState } from "react";
import { ORDER_COUPON_REWARD } from "../../cart/_lib/orderService";
import { useHorseConditions } from "../_hooks/useHorseConditions";
import { useRace } from "../_hooks/useRace";
import { useRaceHorses } from "../_hooks/useRaceHorses";
import { byGate, recentRanks } from "../_lib/records";
import type { Horse, RaceResult as Result } from "../_types";
import BetConfirmModal from "./BetConfirmModal";
import HorseCard from "./HorseCard";
import HorseTrack from "./HorseTrack";
import PayoutGuide from "./PayoutGuide";
import RaceHistory from "./RaceHistory";
import RaceResult from "./RaceResult";
import RaceResultModal from "./RaceResultModal";
import styles from "./race.module.css";

const LINEUP_TITLE_ID = "lineup-title";

/**
 * 출전표 + 트랙 무대 + 결과 + 지난 경주 기록 — BLUEPRINT 8.2 화면 구성 2~6.
 * 말을 고르면 확인창 → [사용하기] 로 쿠폰 1장을 건다. 경주는 경주 시각(RACE_TIMES)에 모두 함께 출발하고,
 * 출발 10초 전부터 끝날 때까지는 걸 수 없다(관람). 끝나면 트랙과 출전표 사이에 순위가 보이고 다음 경주 출전표가 열린다.
 * 쿠폰 정산은 루트의 RaceSettlement 가 하고, 정산된 내 경주는 결과 모달로 한 번 알려 준다.
 * 게이트 번호는 경주마다 지난 경주 도착 순서로 다시 매기고(8.2 "게이트 번호 규칙") 출전표 카드도 그 순서로 놓는다.
 * 출전마 정보는 관리자 변경(같은 브라우저)을 겹친 값이다(useRaceHorses).
 */
export default function RaceBoard({ horses: serverHorses, history: baseHistory }: { horses: Horse[]; history: Result[] }) {
  const horses = useRaceHorses(serverHorses);
  const {
    stage,
    history,
    raceNo,
    gates,
    stageGates,
    gatesOf,
    coupons,
    myBet,
    canBet,
    lock,
    confirmBet,
    lastResult,
    betFor,
    announcement,
    dismissAnnouncement,
  } = useRace(baseHistory, horses);
  const conditions = useHorseConditions();
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

  // 결과 모달의 [다음 경주 출전표 보기] — 모달을 닫고 출전표 제목으로(번호는 이미 다음 경주다)
  const toNextRace = () => {
    dismissAnnouncement();
    requestAnimationFrame(() => document.getElementById(LINEUP_TITLE_ID)?.focus());
  };

  // 내가 건 카드의 상태 문구 — 무대가 이 경주의 것일 때만
  const pickedLabel = stage?.raceNo === raceNo ? (stage.kind === "RUNNING" ? "경주 중" : "출발 대기 중") : "출발 대기 중";

  return (
    <>
      <section className={styles.lineup} aria-labelledby={LINEUP_TITLE_ID}>
        <div className={styles.lineupHead}>
          <div>
            <span className={styles.lineupEyebrow}>Today&apos;s Runners</span>
            <h2 id={LINEUP_TITLE_ID} tabIndex={-1} className={styles.lineupTitle}>
              출전표 <span className={styles.lineupRace}>Race #{raceNo}</span>
            </h2>
          </div>
          <PayoutGuide />
        </div>

        {stage && <HorseTrack horses={horses} gates={stageGates} stage={stage} headingId={stageHeadingId} />}

        {lastResult && stage?.kind !== "RUNNING" && (
          <RaceResult result={lastResult} gates={gatesOf(lastResult.raceNo)} horses={horses} entry={betFor(lastResult)} />
        )}

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
          {byGate(horses, gates).map((horse) => (
            <li key={horse.id}>
              <HorseCard
                horse={horse}
                gate={gates[horse.id]}
                recent={recentRanks(history, horse.id)}
                condition={conditions?.[horse.id] ?? null}
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
          gate={selected ? gates[selected.id] : 0}
          raceNo={raceNo}
          coupons={coupons}
          busy={busy}
          error={error}
          onCancel={() => !busy && setSelected(null)}
          onConfirm={confirm}
        />
      </section>

      <RaceHistory history={history} horses={horses} gatesOf={gatesOf} betFor={betFor} />

      {/* 확인창이 열려 있는 동안에는 기다렸다가 닫힌 뒤에 띄운다(모달 두 개가 겹치지 않게) */}
      <RaceResultModal
        entry={selected ? null : (announcement?.entry ?? null)}
        result={announcement?.result ?? null}
        gates={announcement ? gatesOf(announcement.entry.raceNo) : gates}
        horses={horses}
        coupons={coupons}
        onClose={dismissAnnouncement}
        onNext={toNextRace}
      />
    </>
  );
}
