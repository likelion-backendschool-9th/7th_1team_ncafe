"use client";

import { useState } from "react";
import { raceGates, raceResult } from "@/app/(site)/race/_lib/records";
import type { Horse, RaceResult, ServerRace } from "@/app/(site)/race/_types";
import { formatRaceDate } from "@/lib/time";
import adminStyles from "../../_components/admin.module.css";
import HorseTag from "./HorseTag";
import styles from "./raceAdmin.module.css";

const PAGE = 10;

/** 경주 번호("13" · "#13") 또는 말 이름(영문 · 한글, 1~3위 중)으로 거른다 */
function matches(result: RaceResult, q: string, horses: Horse[]): boolean {
  const query = q.trim().toLowerCase().replace(/^#/, "");
  if (!query) return true;
  if (/^\d+$/.test(query)) return String(result.raceNo).includes(query);
  return result.ranking
    .slice(0, 3)
    .map((id) => horses.find((h) => h.id === id))
    .some((h) => h && (h.name.toLowerCase().includes(query) || h.nameKo.includes(query)));
}

/**
 * 지난 경주 기록 — 서버가 정산한 경주, 최신순. 읽기 전용.
 * 게이트 번호는 경주마다 그 경주 당시 번호(서버 값)다. 10개씩 더 보기.
 */
export default function RaceHistoryTable({ races, horses }: { races: ServerRace[]; horses: Horse[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const history = races.flatMap((race) => {
    const result = raceResult(race);
    return result ? [{ race, result }] : [];
  });
  const filtered = history.filter((h) => matches(h.result, query, horses));
  const visible = filtered.slice(0, limit);
  const horseOf = (id: number) => horses.find((h) => h.id === id);

  return (
    <>
      <div className={adminStyles.toolbar} role="search">
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>검색</span>
          <input
            type="search"
            className={adminStyles.input}
            placeholder="경주 번호(13) 또는 1~3위 말 이름(MOCHA · 모카)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
      </div>

      <p className={adminStyles.resultCount} aria-live="polite">
        {query.trim() ? `검색 결과 ${filtered.length}경주` : `전체 ${history.length}경주`}
      </p>

      {filtered.length === 0 ? (
        <div className={adminStyles.empty}>
          <p>{query.trim() ? "조건에 맞는 경주가 없습니다." : "아직 기록된 경주가 없습니다."}</p>
          {query.trim() && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setQuery("")}>
              검색어 지우기
            </button>
          )}
        </div>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th scope="col">경주</th>
              <th scope="col">출발</th>
              <th scope="col">1위</th>
              <th scope="col">2위</th>
              <th scope="col">3위</th>
              <th scope="col">4~7위</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ race, result: r }) => {
              const gates = raceGates(race, horses);
              return (
                <tr key={r.raceNo}>
                  <td data-label="경주" className="font-board">
                    Race #{r.raceNo}
                  </td>
                  <td data-label="출발" className="font-board">
                    {formatRaceDate(r.date)}
                  </td>
                  {r.ranking.slice(0, 3).map((id, i) => (
                    <td key={id} data-label={`${i + 1}위`}>
                      <HorseTag horse={horseOf(id)} gate={gates[id]} id={id} />
                    </td>
                  ))}
                  <td data-label="4~7위" className={styles.rest}>
                    {r.ranking
                      .slice(3)
                      .map((id) => horseOf(id)?.name.toUpperCase() ?? `#${id}`)
                      .join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {filtered.length > limit && (
        <div className={styles.moreRow}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setLimit((n) => n + PAGE)}>
            더 보기 ({filtered.length - limit}경주 남음)
          </button>
        </div>
      )}
    </>
  );
}
