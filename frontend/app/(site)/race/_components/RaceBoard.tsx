"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useState } from "react";
import { useRace } from "../_hooks/useRace";
import { byGate, recentRanks } from "../_lib/records";
import type { Horse } from "../_types";
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
 * 말을 고르면 확인창 → [사용하기] 로 쿠폰 1장을 건다(로그인 회원만 — 쿠폰 차감은 서버). 경주는 경주 시각에 모두 함께 출발하고,
 * 출발 10초 전부터 끝날 때까지는 걸 수 없다(관람). 끝나면 트랙과 출전표 사이에 순위가 보이고 다음 경주 출전표가 열린다.
 * 쿠폰 정산은 서버가 하고, 정산된 내 경주는 결과 모달로 한 번 알려 준다(RaceSettlement 가 서버 결과를 다시 불러온다).
 * 경주 · 출전마 · 게이트 번호(지난 경주 도착 순서 — 8.2 "게이트 번호 규칙") · 컨디션은 모두 서버 값이고 출전표 카드는 게이트 순으로 놓는다.
 */
export default function RaceBoard() {
  const {
    horses,
    loaded,
    error: loadError,
    stage,
    history,
    raceNo,
    gates,
    stageGates,
    gatesOf,
    conditionOf,
    coupons,
    myBet,
    canBet,
    lock,
    confirmBet,
    lastResult,
    betFor,
    announcement,
    dismissAnnouncement,
  } = useRace();
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
    if (outcome.ok) {
      setSelected(null);
      // 누른 카드 버튼이 사라지므로 포커스를 트랙 무대 제목으로
      requestAnimationFrame(() => document.getElementById(stageHeadingId)?.focus());
    } else if (outcome.message) {
      setError(outcome.message);
    }
  };

  // 결과 모달의 [다음 경주 출전표 보기] — 모달을 닫고 출전표 제목으로(번호는 이미 다음 경주다)
  const toNextRace = () => {
    dismissAnnouncement();
    requestAnimationFrame(() => document.getElementById(LINEUP_TITLE_ID)?.focus());
  };

  // 내가 건 카드의 상태 문구 — 무대가 이 경주의 것일 때만
  const pickedLabel = stage?.raceNo === raceNo ? (stage.kind === "RUNNING" ? "경주 중" : "출발 대기 중") : "출발 대기 중";
  // 트랙 · 결과 · 기록은 말 정보로 그린다 — 출전마를 받기 전(경주 일정이 먼저 올 수 있다)에는 그리지 않는다
  const hasHorses = horses.length > 0;

  return (
    <>
      <section className={styles.lineup} aria-labelledby={LINEUP_TITLE_ID}>
        <div className={styles.lineupHead}>
          <div>
            <span className={styles.lineupEyebrow}>Today&apos;s Runners</span>
            <h2 id={LINEUP_TITLE_ID} tabIndex={-1} className={styles.lineupTitle}>
              출전표 {raceNo !== null && <span className={styles.lineupRace}>Race #{raceNo}</span>}
            </h2>
          </div>
          <PayoutGuide />
        </div>

        {stage && hasHorses && <HorseTrack horses={horses} gates={stageGates} stage={stage} headingId={stageHeadingId} />}

        {lastResult && hasHorses && stage?.kind !== "RUNNING" && (
          <RaceResult result={lastResult} gates={gatesOf(lastResult.raceNo)} horses={horses} entry={betFor(lastResult)} />
        )}

        {!myBet && lock === "GATE_CLOSED" && (
          <p className={styles.noCoupon} role="status">
            <strong>마감</strong> — 출발 10초 전부터 경주가 끝날 때까지는 걸 수 없어요. 트랙에서 관람해 주세요.
          </p>
        )}
        {loadError && (
          <p className={styles.noCoupon} role="alert">
            <strong>경주 정보를 불러오지 못했어요</strong> — {loadError.message}
          </p>
        )}
        {!loadError && !loaded && (
          <p className={styles.noCoupon} role="status">
            출전표를 불러오는 중이에요…
          </p>
        )}
        {!myBet && lock === "NO_RACE" && (
          <p className={styles.noCoupon} role="status">
            <strong>예정된 경주가 없어요</strong> — 다음 경주 일정이 정해지면 여기서 응원할 말을 고를 수 있어요.
          </p>
        )}
        {!myBet && lock === "LOGIN" && (
          <p className={styles.noCoupon} role="status">
            <strong>로그인하고 참여하세요</strong> — 로그인하면 쿠폰을 걸어 응원할 말을 고를 수 있어요.
            <Link href="/login?next=/race" className={styles.noCouponLink}>
              로그인 <span aria-hidden>›</span>
            </Link>
          </p>
        )}
        {!myBet && lock === "NO_COUPON" && (
          <p className={styles.noCoupon} role="status">
            <strong>쿠폰이 부족합니다</strong> — 쿠폰이 1장 있어야 걸 수 있어요.
          </p>
        )}

        <ul className={styles.cards}>
          {byGate(horses, gates).map((horse) => (
            <li key={horse.id}>
              <HorseCard
                horse={horse}
                gate={gates[horse.id]}
                recent={recentRanks(history, horse.id)}
                condition={conditionOf(horse.id)}
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
          raceNo={raceNo ?? 0}
          coupons={coupons}
          busy={busy}
          error={error}
          onCancel={() => !busy && setSelected(null)}
          onConfirm={confirm}
        />
      </section>

      {hasHorses && <RaceHistory history={history} horses={horses} gatesOf={gatesOf} betFor={betFor} />}

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
