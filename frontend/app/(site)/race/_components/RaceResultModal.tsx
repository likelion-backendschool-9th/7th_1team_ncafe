"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import Modal from "@/components/Modal";
import type { RaceEntry } from "@/types/common";
import { payoutBreakdown, RACE_ENTRY_COUPONS } from "../_lib/payout";
import { rankLabel } from "../_lib/records";
import type { Gates, Horse, RaceResult } from "../_types";
import GateBadge from "./GateBadge";
import styles from "./race.module.css";

interface RaceResultModalProps {
  entry: RaceEntry | null; // 정산된 내 경주 — null 이면 닫힘
  result: RaceResult | null; // 그 경주의 순위(1~3위 줄)
  gates: Gates; // 그 경주 당시 게이트 번호
  horses: Horse[];
  coupons: number; // 정산 뒤 보유 수
  onClose: () => void;
  onNext: () => void; // [다음 경주 출전표 보기]
}

/**
 * 결과 모달(정산 알림) — 내가 건 경주가 정산되면 /race 에서 한 번 뜬다(다른 페이지에 있었다면 돌아왔을 때).
 * YOUR HORSE 순위 · WIN!/PLACE!/SHOW!/NEXT TIME! + 돌려받은 쿠폰(원금 + 추가) · 보유 수 + 1~3위 한 줄. 1~3위면 confetti.
 * 1~7위 전체는 트랙 아래 결과 섹션이 보여 준다. 관람만 한 경주에는 뜨지 않는다(사용자 결정 2026-10-13).
 */
export default function RaceResultModal({ entry, result, gates, horses, coupons, onClose, onNext }: RaceResultModalProps) {
  const byId = (id: number) => horses.find((h) => h.id === id) ?? null;
  const horse = entry ? byId(entry.horseId) : null;
  const rank = entry?.rank ?? 0;
  const hit = (entry?.payout ?? 0) > 0;
  const name = horse?.name.toUpperCase() ?? "";

  return (
    <Modal open={entry !== null && horse !== null} onClose={onClose} label={`Race #${entry?.raceNo ?? ""} 결과`} variant="sheet">
      {entry && horse && (
        <div className={styles.settle}>
          {hit && <Confetti colors={horses.map((h) => h.color)} />}
          <span className={styles.confirmEyebrow}>RACE #{entry.raceNo} · RESULT</span>

          <div className={styles.confirmHorse}>
            <Image src={horse.image} alt="" width={168} height={120} />
            <span className={styles.settleLabel}>YOUR HORSE</span>
            <span className={styles.confirmHorseName}>
              <GateBadge horse={horse} gate={entry.gate} size="sm" />
              {entry.gate}번 {name}
            </span>
          </div>

          <p className={`${styles.settleVerdict} ${hit ? styles.settleVerdictHit : ""}`}>
            {rank}위 · {rankLabel(rank)}
          </p>

          <h2 className={styles.confirmTitle}>
            {hit ? `쿠폰 ${entry.payout}장을 돌려받았어요` : `건 쿠폰 ${RACE_ENTRY_COUPONS}장은 돌아오지 않아요`}
          </h2>
          <p className={styles.confirmNote}>
            {hit ? `${payoutBreakdown(entry.payout)} · ` : "다음 경주에서 다시 응원해 주세요 · "}보유 {coupons}장
          </p>

          {result && (
            <ol className={styles.podium} aria-label="1~3위">
              {result.ranking.slice(0, 3).map((id, i) => {
                const h = byId(id);
                if (!h) return null;
                return (
                  <li key={id} className={id === entry.horseId ? styles.podiumMine : undefined}>
                    <span className={styles.podiumRank}>{i + 1}위</span>
                    <GateBadge horse={h} gate={gates[id]} size="sm" />
                    {h.name.toUpperCase()}
                  </li>
                );
              })}
            </ol>
          )}

          <div className={styles.confirmActions}>
            <button type="button" className="btn btn-outline" onClick={onNext}>
              다음 경주 출전표 보기
            </button>
            <Link href="/my#coupons" className="btn" onClick={onClose}>
              내 쿠폰 보기
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

const CONFETTI_PIECES = 28;

/** 1~3위 축하 — CSS 로만 한 번 떨어진다(값은 인덱스로 정해 렌더마다 같다). prefers-reduced-motion 이면 숨김 */
function Confetti({ colors }: { colors: string[] }) {
  const palette = [...colors, "#c9a227"];
  return (
    <div className={styles.confetti} aria-hidden>
      {Array.from({ length: CONFETTI_PIECES }, (_, i) => (
        <span
          key={i}
          style={
            {
              "--x": `${(i * 37) % 100}%`,
              "--delay": `${(i % 7) * 0.11}s`,
              "--drift": `${((i * 53) % 80) - 40}px`,
              "--spin": `${(i * 97) % 360}deg`,
              background: palette[i % palette.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
