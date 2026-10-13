import TicketBadge from "@/components/TicketBadge";
import { formatRaceDate } from "@/lib/time";
import type { RaceEntry } from "@/types/common";
import { payoutBreakdown, RACE_ENTRY_COUPONS } from "../_lib/payout";
import { rankLabel } from "../_lib/records";
import type { Gates, Horse, RaceResult as Result } from "../_types";
import GateBadge from "./GateBadge";
import styles from "./race.module.css";

/**
 * 경주 결과 — 가장 최근에 끝난 경주의 1~7위(트랙 무대와 출전표 사이, 사용자 요청 2026-10-13).
 * 내가 건 말은 MY PICK 으로 강조하고 WIN · PLACE · SHOW(1 · 2 · 3착) 라벨 + 쿠폰 정산 결과를 붙인다.
 * 번호는 **그 경주 당시** 게이트 번호다(사용자 결정 2026-10-13) — 바로 아래 출전표(다음 경주)와 같은 말의 번호가 다를 수 있다.
 */
export default function RaceResult({
  result,
  gates,
  horses,
  entry,
}: {
  result: Result;
  gates: Gates;
  horses: Horse[];
  entry: RaceEntry | null;
}) {
  const byId = (id: number) => horses.find((h) => h.id === id) ?? horses[0];
  const myHorse = entry ? byId(entry.horseId) : null;
  const myRank = entry ? result.ranking.indexOf(entry.horseId) + 1 : 0;
  const headingId = `race-result-${result.raceNo}`;

  // 정산은 RaceSettlement 가 한다 — 결과가 보충으로 먼저 보이면 잠깐 "정산 중"
  let payoutText = "";
  if (entry) {
    if (entry.settledAt === null) payoutText = "쿠폰 정산 중…";
    else if (entry.payout > 0) payoutText = `쿠폰 ${entry.payout}장을 돌려받았어요 (${payoutBreakdown(entry.payout)})`;
    else payoutText = `건 쿠폰 ${RACE_ENTRY_COUPONS}장은 돌아오지 않았어요`;
  }

  return (
    <section className={styles.result} aria-labelledby={headingId}>
      <div className={styles.resultHead}>
        <div>
          <span className={styles.lineupEyebrow}>Race Result</span>
          <h3 id={headingId} className={styles.resultTitle}>
            Race #{result.raceNo} 순위 <span className={styles.resultDate}>{formatRaceDate(result.date)} 출발</span>
          </h3>
        </div>
        <div className={styles.resultMine}>
          {entry && myHorse ? (
            <>
              <p className={styles.resultMineLine}>
                내 말 <strong>{gates[myHorse.id]}번 {myHorse.name.toUpperCase()}</strong> · <strong>{myRank}위</strong>{" "}
                <span className={`${styles.resultVerdict} ${myRank <= 3 ? styles.resultVerdictHit : ""}`}>{rankLabel(myRank)}</span>
              </p>
              <p className={styles.resultPayout}>{payoutText}</p>
            </>
          ) : (
            <p className={styles.resultMineLine}>이번 경주에는 참여하지 않았어요.</p>
          )}
        </div>
      </div>
      <ol className={styles.resultList}>
        {result.ranking.map((id, i) => {
          const horse = byId(id);
          const mine = entry?.horseId === id;
          return (
            <li key={id} className={`${styles.resultRow} ${i < 3 ? styles.resultTop : ""} ${mine ? styles.resultRowMine : ""}`}>
              <span className={styles.resultRank}>
                {i + 1}
                <small>위</small>
              </span>
              <GateBadge horse={horse} gate={gates[id]} />
              <span className={styles.resultName}>
                {horse.name.toUpperCase()}
                <small>{horse.nameKo}</small>
              </span>
              {i < 3 && <span className={styles.resultLabel}>{rankLabel(i + 1)}</span>}
              {mine && <TicketBadge tone="PICK" />}
              <span className="visually-hidden">
                {i + 1}위 {gates[id]}번 {horse.name.toUpperCase()}
                {mine && " (내 말)"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
