"use client";

import { useEffect, useMemo, useState } from "react";
import { memberApi } from "@/lib/memberApi";
import { useNow } from "@/lib/useCountdown";
import { kstDate, kstMinutes, minutesOf } from "@/lib/kst";
import SeatCanvas from "@/app/(site)/seat/_components/SeatCanvas";
import { chairsOf } from "@/app/(site)/seat/_lib/geometry";
import { summarize } from "@/app/(site)/seat/_lib/summary";
import { parseFloorPlan } from "@/app/(site)/seat/_lib/floorPlan";
import type { ChairStatusMap, FloorPlan, Seat } from "@/app/(site)/seat/_types";
import styles from "./member.module.css";
import operations from "./branchOperations.module.css";

const empty = new Set<string>();
interface Block { start: string; end: string }

export default function AdminSeatMap({ branchId, branchName, date, version, selectedCode, selectedChairNo, busy, onSelect }: {
  branchId: string; branchName: string; date: string; version: number;
  selectedCode: string; selectedChairNo: number; busy: boolean; onSelect: (code: string, chairNo: number) => void;
}) {
  const now = useNow();
  const [layout, setLayout] = useState<{ plan: FloorPlan; seats: Seat[]; blocks: Block[]; error: string } | null>(null);
  const [time, setTime] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; statuses: ChairStatusMap; error: string } | null>(null);
  const blocks = layout?.blocks ?? [];
  const currentMinutes = now === null ? 0 : kstMinutes(now);
  const defaultBlock = now !== null && date === kstDate(now)
    ? blocks.find(b => minutesOf(b.end) > currentMinutes) ?? blocks.at(-1)
    : blocks[0];
  const start = time || defaultBlock?.start || "";
  const block = blocks.find(b => b.start === start);
  const key = `${branchId}/${date}/${start}/${version}/${refresh}`;

  useEffect(() => {
    let active = true;
    // 평면도(구역 · 구조물)는 지점마다 다르다 — 지점 정보의 sections · fixtures
    Promise.all([
      memberApi<{ sections: string | null; fixtures: string | null }>(`/branches/${encodeURIComponent(branchId)}`),
      memberApi<Seat[]>(`/seats?branchId=${encodeURIComponent(branchId)}`),
      memberApi<Block[]>("/seats/time-blocks"),
    ])
      .then(([branch, seats, blocks]) => { if (active) setLayout({ plan: parseFloorPlan(branch.sections, branch.fixtures), seats, blocks: blocks.map(b => ({ start: b.start.slice(0, 5), end: b.end.slice(0, 5) })), error: "" }); })
      .catch((e: unknown) => { if (active) setLayout({ plan: { sections: [], fixtures: [] }, seats: [], blocks: [], error: e instanceof Error ? e.message : "배치도를 불러오지 못했습니다." }); });
    return () => { active = false; };
  }, [branchId]);

  useEffect(() => {
    if (!start) return;
    let active = true;
    memberApi<ChairStatusMap>(`/seats/status?branchId=${encodeURIComponent(branchId)}&date=${date}&start=${start}`)
      .then(statuses => { if (active) setResult({ key, statuses, error: "" }); })
      .catch((e: unknown) => { if (active) setResult({ key, statuses: {}, error: e instanceof Error ? e.message : "좌석 상태를 불러오지 못했습니다." }); });
    return () => { active = false; };
  }, [key, branchId, date, start]);

  useEffect(() => {
    const timer = setInterval(() => setRefresh(v => v + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const seats = layout?.seats;
  const chairs = useMemo(() => seats?.flatMap(chairsOf) ?? [], [seats]);
  const selectedChairs = new Set(chairs.filter(c => c.seat.id === selectedCode && (!selectedChairNo || c.no === selectedChairNo)).map(c => c.id));
  const current = result?.key === key ? result : null;
  const statuses = current && !current.error ? current.statuses : null;
  const summary = seats && statuses ? summarize(seats, statuses) : null;

  if (layout?.error) return <p role="alert">{layout.error}</p>;
  if (!layout) return <p role="status">좌석 배치도를 불러오는 중…</p>;
  if (layout.seats.length === 0) return <p>등록된 좌석이 없습니다.</p>;
  return <>
    <div className={operations.mapToolbar}>
    <label className={styles.field}>배치도 시간대<select value={start} onChange={e => setTime(e.target.value)}>
      {blocks.map(b => <option key={b.start} value={b.start}>{b.start}~{b.end}</option>)}
    </select></label>
    <button className={styles.button} onClick={() => setRefresh(v => v + 1)}>배치도 새로고침</button>
    {summary && <p className={operations.mapSummary} role="status"><span>전체 <strong>{summary.total}자리</strong></span><span>빈자리 <strong>{summary.available}</strong></span><span>예약 <strong>{summary.byStatus.RESERVED}</strong></span><span>사용 중 <strong>{summary.byStatus.USING}</strong></span><span>수리 중 <strong>{summary.byStatus.REPAIR}</strong></span></p>}
    </div>
    {current?.error && <p role="alert">{current.error}</p>}
    <SeatCanvas fitToWidth plan={layout.plan} seats={layout.seats} chairs={chairs} statuses={statuses}
      mine={empty} selected={selectedChairs} interactive={!!statuses && !busy} allowOccupiedSelection branchName={branchName} summary={summary}
      caption={`${date} ${start}~${block?.end ?? ""} · 실제 좌석 현황 · 15초마다 갱신`}
      dimmed={current?.error ? "좌석 상태를 확인하지 못했습니다. 새로고침해주세요." : !statuses ? "좌석 상태를 불러오는 중…" : null}
      onToggle={id => { const chair = chairs.find(c => c.id === id); if (chair && statuses && !busy) onSelect(chair.seat.id, chair.no); }} />
  </>;
}
