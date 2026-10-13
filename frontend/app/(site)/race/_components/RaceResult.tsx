import TicketBadge from "@/components/TicketBadge";
import { formatRaceDate, rankLabel } from "../_lib/records";
import type { Horse, RaceBet, RaceResult as Result } from "../_types";
import GateBadge from "./GateBadge";
import styles from "./race.module.css";

/**
 * 경주 결과 — 가장 최근에 끝난 경주의 1~7위(트랙 무대와 출전표 사이, 사용자 요청 2026-10-13).
 * 내가 건 말은 MY PICK 으로 강조하고 WIN · PLACE · SHOW(1 · 2 · 3착) 라벨을 붙인다. 쿠폰 정산 · 내 레이스 기록은 9단계.
 */
export default function RaceResult({ result, horses, myBet }: { result: Result; horses: Horse[]; myBet: RaceBet | null }) {
  const byId = (id: number) => horses.find((h) => h.id === id) ?? horses[0];
  const myHorse = myBet ? byId(myBet.horseId) : null;
  const myRank = myBet ? result.ranking.indexOf(myBet.horseId) + 1 : 0;
  const headingId = `race-result-${result.raceNo}`;

  return (
    <section className={styles.result} aria-labelledby={headingId}>
      <div className={styles.resultHead}>
        <div>
          <span className={styles.lineupEyebrow}>Race Result</span>
          <h3 id={headingId} className={styles.resultTitle}>
            Race #{result.raceNo} 순위 <span className={styles.resultDate}>{formatRaceDate(result.date)} 출발</span>
          </h3>
        </div>
        <p className={styles.resultMine}>
          {myHorse ? (
            <>
              내 말 <strong>{myHorse.id}번 {myHorse.name.toUpperCase()}</strong> · <strong>{myRank}위</strong>{" "}
              <span className={`${styles.resultVerdict} ${myRank <= 3 ? styles.resultVerdictHit : ""}`}>{rankLabel(myRank)}</span>
            </>
          ) : (
            "이번 경주에는 참여하지 않았어요."
          )}
        </p>
      </div>
      <ol className={styles.resultList}>
        {result.ranking.map((id, i) => {
          const horse = byId(id);
          const mine = myBet?.horseId === id;
          return (
            <li key={id} className={`${styles.resultRow} ${i < 3 ? styles.resultTop : ""} ${mine ? styles.resultRowMine : ""}`}>
              <span className={styles.resultRank}>
                {i + 1}
                <small>위</small>
              </span>
              <GateBadge horse={horse} />
              <span className={styles.resultName}>
                {horse.name.toUpperCase()}
                <small>{horse.nameKo}</small>
              </span>
              {i < 3 && <span className={styles.resultLabel}>{rankLabel(i + 1)}</span>}
              {mine && <TicketBadge tone="PICK" />}
              <span className="visually-hidden">
                {i + 1}위 {horse.id}번 {horse.name.toUpperCase()}
                {mine && " (내 말)"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
