import TicketBadge from "@/components/TicketBadge";
import { formatRaceDate } from "@/lib/time";
import type { RaceEntry } from "@/types/common";
import type { Gates, Horse, RaceResult } from "../_types";
import GateBadge from "./GateBadge";
import styles from "./race.module.css";

/** 보여 줄 경기 수 */
const RECENT = 5;

/**
 * RECENT RACES — 최근 5경기의 1~3위(최신이 앞, 출전표 아래). 기록은 useRace 의 history
 * (이 세션에서 확정된 경주 + 지나간 경주 보충 + Mock 기록)라 경주가 끝나면 맨 앞에 바로 붙는다.
 * 내가 건 경주는 MY PICK 과 내 말 순위를 함께 보여 준다. 번호는 카드마다 그 경주 당시 게이트 번호(gatesOf).
 */
export default function RaceHistory({
  history,
  horses,
  gatesOf,
  betFor,
}: {
  history: RaceResult[];
  horses: Horse[];
  gatesOf: (raceNo: number) => Gates;
  betFor: (result: RaceResult) => RaceEntry | null;
}) {
  const byId = (id: number) => horses.find((h) => h.id === id) ?? horses[0];
  const recent = history.slice(0, RECENT);
  if (recent.length === 0) return null;

  return (
    <section className={styles.history} aria-labelledby="race-history-title">
      <div className={styles.historyHead}>
        <span className={styles.lineupEyebrow}>Recent Races</span>
        <h2 id="race-history-title" className={styles.historyTitle}>
          지난 경주 기록
        </h2>
      </div>
      <ol className={styles.historyList}>
        {recent.map((race) => {
          const gates = gatesOf(race.raceNo);
          const entry = betFor(race);
          const myHorse = entry ? byId(entry.horseId) : null;
          const myRank = entry ? race.ranking.indexOf(entry.horseId) + 1 : 0;
          return (
            <li key={race.raceNo} className={`${styles.historyCard} ${entry ? styles.historyCardMine : ""}`}>
              <div className={styles.historyCardHead}>
                <strong>Race #{race.raceNo}</strong>
                <span>{formatRaceDate(race.date)}</span>
              </div>
              <ol className={styles.historyTop} aria-label={`Race #${race.raceNo} 1~3위`}>
                {race.ranking.slice(0, 3).map((id, i) => {
                  const horse = byId(id);
                  return (
                    <li key={id}>
                      <span className={styles.historyRank} aria-hidden>
                        {i + 1}
                        <small>위</small>
                      </span>
                      <GateBadge horse={horse} gate={gates[id]} size="sm" />
                      <span className={styles.historyName} aria-hidden>
                        {horse.name.toUpperCase()}
                      </span>
                      <span className="visually-hidden">
                        {i + 1}위 {gates[id]}번 {horse.name.toUpperCase()}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {entry && myHorse && (
                <p className={styles.historyMine}>
                  <TicketBadge tone="PICK" />
                  <span>
                    {gates[myHorse.id]}번 {myHorse.name.toUpperCase()} · <strong>{myRank}위</strong>
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
