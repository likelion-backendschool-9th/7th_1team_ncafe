"use client";

import Image from "next/image";
import Modal from "@/components/Modal";
import { RACE_ENTRY_COUPONS } from "../_lib/payout";
import type { Horse } from "../_types";
import GateBadge from "./GateBadge";
import PayoutGuide from "./PayoutGuide";
import styles from "./race.module.css";

interface BetConfirmModalProps {
  horse: Horse | null; // null 이면 닫힘
  raceNo: number;
  coupons: number;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** "MOCHA에 쿠폰 1장을 사용하시겠습니까?" + 보상 안내 + 4위 이하 안내 — [취소] [사용하기] */
export default function BetConfirmModal({ horse, raceNo, coupons, busy, error, onCancel, onConfirm }: BetConfirmModalProps) {
  const name = horse?.name.toUpperCase() ?? "";

  return (
    <Modal open={horse !== null} onClose={onCancel} label={`${name}에 쿠폰 걸기`} variant="sheet" dismissible={!busy}>
      {horse && (
        <div className={styles.confirm}>
          <span className={styles.confirmEyebrow}>RACE #{raceNo} · MY PICK</span>
          <div className={styles.confirmHorse}>
            <Image src={horse.image} alt="" width={168} height={120} />
            <span className={styles.confirmHorseName}>
              <GateBadge horse={horse} size="sm" />
              {horse.id}번 {name}
            </span>
          </div>
          <h2 className={styles.confirmTitle}>
            {name}에 쿠폰 {RACE_ENTRY_COUPONS}장을 사용하시겠습니까?
          </h2>
          <PayoutGuide compact />
          <p className={styles.confirmNote}>
            4위 이하면 쿠폰은 돌아오지 않아요 · 보유 {coupons}장 → {coupons - RACE_ENTRY_COUPONS}장
          </p>
          {error && (
            <p className={styles.confirmError} role="alert">
              {error}
            </p>
          )}
          <div className={styles.confirmActions}>
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
              취소
            </button>
            <button type="button" className="btn btn-gold" onClick={onConfirm} disabled={busy}>
              {busy ? "거는 중…" : "사용하기"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
