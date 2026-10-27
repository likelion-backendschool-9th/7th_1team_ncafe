"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/(site)/race/_components/race.module.css";
import { useLosingStreak } from "@/app/(site)/race/_hooks/useRaceData";
import { losingStreakStore } from "@/app/(site)/race/_lib/raceStores";
import { useAuth } from "./AuthProvider";
import Modal from "./Modal";

/** 지급 예정 시각이 지난 뒤 다시 묻는 간격(서버 지급 스케줄러는 10초마다 돈다) */
const RECHECK_MS = 5000;

/**
 * 연패 위로 쿠폰 알림(사용자 결정 2026-10-27) — 서버가 위로 쿠폰을 주면 어느 페이지에 있든 모달로 한 번 알린다.
 * 지급은 서버가 한다(정책 연패 수 이상 · 쿠폰 0장 · 마지막 경주 정산 뒤 지연 시간). 여기는 지급 예정 시각(dueAt)에 맞춰 다시 불러오고,
 * 이 페이지를 연 뒤(performance.timeOrigin) 새로 받은 위로 쿠폰이 있으면 띄운다. 지급 예정 시각은 정산 때 RaceSettlement 가 불러온다.
 * app/layout.tsx 에서 RaceSettlement 옆에 둔다.
 */
export default function LosingStreakNotice() {
  const { member, refresh: refreshMember } = useAuth();
  const status = useLosingStreak().data;
  const [seenId, setSeenId] = useState<number | null>(null);
  const dueAt = status?.dueAt ?? null;

  // 지급 예정 시각이 지나면 받을 때까지 다시 묻는다(받으면 dueAt 이 비어 멈춘다)
  useEffect(() => {
    if (dueAt === null) return;
    const refresh = () => void losingStreakStore.refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    const wait = setTimeout(
      () => {
        refresh();
        timer = setInterval(refresh, RECHECK_MS);
      },
      Math.max(0, dueAt - Date.now()) + 1000,
    );
    return () => {
      clearTimeout(wait);
      clearInterval(timer);
    };
  }, [dueAt]);

  const latest = member ? (status?.latest ?? null) : null;
  const freshId = latest !== null && latest.grantedAt >= performance.timeOrigin ? latest.id : null;

  // 새로 받았으면 보유 쿠폰 수(전광판)도 다시
  useEffect(() => {
    if (freshId !== null) void refreshMember();
  }, [freshId, refreshMember]);

  const open = freshId !== null && freshId !== seenId;
  const close = () => setSeenId(freshId);

  return (
    <Modal open={open} onClose={close} label="연패 위로 쿠폰" variant="sheet">
      {latest && (
        <div className={styles.settle}>
          <span className={styles.confirmEyebrow}>CHEER UP · 위로 쿠폰</span>
          <p className={styles.settleVerdict}>+{latest.coupons}장</p>
          <h2 className={styles.confirmTitle}>위로 쿠폰 {latest.coupons}장을 드렸어요</h2>
          <p className={styles.confirmNote}>
            아쉬운 경주가 이어졌네요. 다음 경주에서 다시 응원해 주세요.
            <br />
            {latest.note}
            {member && ` · 보유 ${member.couponCount}장`}
          </p>
          <div className={styles.confirmActions}>
            <button type="button" className="btn btn-outline" onClick={close}>
              닫기
            </button>
            <Link href="/race" className="btn" onClick={close}>
              다음 경주 보러 가기
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
