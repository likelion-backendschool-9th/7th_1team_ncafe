import Image from "next/image";
import ConditionMeter from "@/components/ConditionMeter";
import TicketBadge from "@/components/TicketBadge";
import { TRAIT_LABEL } from "../_lib/records";
import type { Horse, HorseCondition } from "../_types";
import GateBadge from "./GateBadge";
import styles from "./race.module.css";

interface HorseCardProps {
  horse: Horse;
  /** 이번 경주의 게이트 번호(지난 경주 도착 순서) */
  gate: number;
  /** 최근 순위(최근 경기부터) */
  recent: number[];
  /** 오늘의 컨디션 — 날짜를 알기 전에는 null */
  condition: HorseCondition | null;
  /** 내가 건 말 */
  picked: boolean;
  /** 내가 건 말의 상태 문구("출발 대기 중" · "경주 중" …) — 비어 있으면 그리지 않는다 */
  pickedLabel?: string;
  /** 선택 버튼 — BETTING 이 아니면(이미 걸었으면) 버튼을 그리지 않는다 */
  action: "pick" | "disabled" | "none";
  onPick: () => void;
}

/**
 * 출전표 카드 — 게이트 번호(대표색 원) · 이름 · 말 이미지 · 성향 · 최근 성적 · 컨디션 · 설명 · [이 말 선택하기].
 * 최근 성적은 전광판 칸으로, 1위는 금색(WINNER 색).
 */
export default function HorseCard({ horse, gate, recent, condition, picked, pickedLabel = "출발 대기 중", action, onPick }: HorseCardProps) {
  const label = `${gate}번 ${horse.name.toUpperCase()}`;

  return (
    <article className={`${styles.card} ${picked ? styles.cardPicked : ""}`} aria-labelledby={`horse-${horse.id}`}>
      <div className={styles.cardHead}>
        <GateBadge horse={horse} gate={gate} />
        <div className={styles.cardTitle}>
          <h3 id={`horse-${horse.id}`} className={styles.cardName}>
            <span className="visually-hidden">{gate}번 </span>
            {horse.name.toUpperCase()}
          </h3>
          <span className={styles.cardSub}>
            {horse.nameKo} · {horse.colorName} 조끼
          </span>
        </div>
        {picked && (
          <span className={styles.cardPick}>
            <TicketBadge tone="PICK" />
          </span>
        )}
      </div>

      <div className={styles.cardPhoto}>
        <Image src={horse.image} alt="" width={420} height={300} sizes="(max-width: 767px) 90vw, 280px" />
      </div>

      <dl className={styles.cardFacts}>
        <div>
          <dt>성향</dt>
          <dd>
            <span className={styles.trait}>{TRAIT_LABEL[horse.trait]}</span> {horse.personality}
          </dd>
        </div>
        <div>
          <dt>최근 성적</dt>
          <dd>
            {recent.length === 0 ? (
              "기록 없음"
            ) : (
              <>
                <ol className={styles.ranks} aria-hidden>
                  {recent.map((rank, i) => (
                    <li key={i} className={rank === 1 ? styles.rankWin : undefined}>
                      {rank}
                      <small>위</small>
                    </li>
                  ))}
                </ol>
                <span className="visually-hidden">최근 경기부터 {recent.map((r) => `${r}위`).join(", ")}</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>컨디션</dt>
          <dd>
            <ConditionMeter condition={condition} />
          </dd>
        </div>
      </dl>

      <p className={styles.cardDesc}>“{horse.description}”</p>

      {action !== "none" && (
        <button
          type="button"
          className={`btn btn-block ${styles.cardButton}`}
          disabled={action === "disabled"}
          onClick={onPick}
        >
          이 말 선택하기
          <span className="visually-hidden"> — {label}</span>
        </button>
      )}
      {picked && pickedLabel && <p className={styles.cardWaiting}>{pickedLabel}</p>}
    </article>
  );
}
