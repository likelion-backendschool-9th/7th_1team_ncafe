"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, memberApi } from "@/lib/memberApi";
import { useKstToday } from "@/lib/useCountdown";
import styles from "./member.module.css";
import AdminSeatMap from "./AdminSeatMap";
import operations from "./branchOperations.module.css";

type SaleStatus = "ON_SALE" | "SOLD_OUT" | "HIDDEN";
interface Branch { id: string; name: string }
interface Menu { menuId: number; nameKor: string; status: SaleStatus }
interface Seat { code: string; capacity: number; underRepair: boolean; repairChairNos: number[] }
interface Reservation { id: number; kind: string; status: string; memberNickname: string; date: string; start: string; end: string; people: number; chairIds: string[]; chairLabels: string[] }
interface OperationLog { id: number; actorLoginId: string; action: string; target: string; beforeValue: string; afterValue: string; occurredAt: string }
interface RepairConfirmation { path: string; label: string; reservations: Reservation[] }
const actionNames: Record<string, string> = { SEAT_REPAIR: "테이블 수리", CHAIR_REPAIR: "의자 수리", MENU_STATUS: "메뉴 판매 상태", RESERVATION_CHECK_IN: "방문 확인", RESERVATION_NO_SHOW: "노쇼 처리" };
const logValues: Record<string, string> = { true: "수리 중", false: "정상", ON_SALE: "판매 중", SOLD_OUT: "품절", HIDDEN: "판매 종료", ACTIVE: "예약", CHECKED_IN: "방문 확인", NO_SHOW: "노쇼" };
const saleNames: Record<SaleStatus, string> = { ON_SALE: "판매 중", SOLD_OUT: "품절", HIDDEN: "판매 종료 (숨김)" };
const statusNames: Record<string, string> = { ACTIVE: "예약", CHECKED_IN: "방문 확인", NO_SHOW: "노쇼", CANCELED: "취소" };

export default function BranchOperations() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState("");
  const [repairCode, setRepairCode] = useState("");
  const [chairNo, setChairNo] = useState(0);
  const [confirmation, setConfirmation] = useState<RepairConfirmation | null>(null);
  const [tab, setTab] = useState<"seats" | "menus" | "logs">("seats");
  const today = useKstToday();
  const day = date || today;
  const selected = branchId || branches?.[0]?.id || "";
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [result, setResult] = useState<{ key: string; menus: Menu[]; seats: Seat[]; reservations: Reservation[]; logs: OperationLog[]; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const key = `${selected}/${day}/${tab}/${version}`;

  useEffect(() => {
    let active = true;
    memberApi<Branch[]>("/branch-admin/branches").then(data => { if (active) { setBranches(data); setLoadError(""); } })
      .catch((e: unknown) => { if (active) setLoadError(e instanceof Error ? e.message : "담당 지점을 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [version]);

  useEffect(() => {
    if (!selected || !day) return;
    let active = true;
    const base = `/admin/branches/${encodeURIComponent(selected)}`;
    async function loadTab() {
      const data = { key, menus: [] as Menu[], seats: [] as Seat[], reservations: [] as Reservation[], logs: [] as OperationLog[], error: "" };
      try {
        if (tab === "menus") data.menus = await memberApi<Menu[]>(`${base}/menus`);
        else if (tab === "logs") data.logs = await memberApi<OperationLog[]>(`${base}/operation-logs`);
        else {
          [data.seats, data.reservations] = await Promise.all([
            memberApi<Seat[]>(`${base}/seats`), memberApi<Reservation[]>(`${base}/seat-reservations?date=${day}`),
          ]);
          if (data.seats.some(s => !Array.isArray(s.repairChairNos)) || data.reservations.some(r => !Array.isArray(r.chairIds))) {
            throw new Error("실행 중인 백엔드에 최신 좌석 기능이 반영되지 않았습니다. 백엔드를 재시작한 뒤 새로고침해주세요. H2 메모리 DB는 재시작하면 기존 테스트 예약이 초기화됩니다.");
          }
        }
      } catch (e) {
        data.error = e instanceof ApiError && e.status === 404
          ? "이 기능의 API가 실행 중인 백엔드에 없습니다. 최신 코드로 백엔드를 재시작한 뒤 새로고침해주세요. H2 메모리 DB는 재시작하면 기존 테스트 예약이 초기화됩니다."
          : e instanceof Error ? e.message : "업무 정보를 불러오지 못했습니다.";
      }
      if (active) setResult(data);
    }
    void loadTab();
    return () => { active = false; };
  }, [key, selected, day, tab]);

  async function update(path: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await memberApi(path, "PATCH", body); setVersion(v => v + 1); setMessage("변경사항을 저장했습니다."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  const current = result?.key === key ? result : null;
  const base = `/admin/branches/${encodeURIComponent(selected)}`;
  const selectedLabel = chairNo ? `${repairCode} ${chairNo}번` : repairCode;
  const selectedReservations = current?.reservations.filter(r => r.chairIds.some(id => chairNo ? id === `${repairCode}-${chairNo}` : id.startsWith(`${repairCode}-`))) ?? [];
  async function prepareRepair(seat: Seat, no = 0) {
    if (busy) return;
    const path = `${base}/seats/${encodeURIComponent(seat.code)}${no ? `/chairs/${no}` : ""}/repair`;
    const repaired = no ? seat.repairChairNos.includes(no) : seat.underRepair;
    if (repaired) { await update(path, { underRepair: false }); return; }
    setBusy(true); setMessage("");
    try {
      const reservations = await memberApi<Reservation[]>(`${base}/seats/${encodeURIComponent(seat.code)}/repair-conflicts${no ? `?chairNo=${no}` : ""}`);
      if (reservations.length) setConfirmation({ path, label: no ? `${seat.code} ${no}번 의자` : `${seat.code} 전체`, reservations });
      else {
        await memberApi(path, "PATCH", { underRepair: true });
        setVersion(v => v + 1); setMessage("변경사항을 저장했습니다.");
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "영향을 받는 예약을 확인하지 못했습니다."); }
    finally { setBusy(false); }
  }
  function reservationActions(r: Reservation) {
    return r.kind === "RESERVED" && r.status === "ACTIVE" ? <>
      <button className={styles.button} disabled={busy} onClick={() => void update(`/admin/seat-reservations/${r.id}/check-in`)}>방문 확인</button>
      <button className={styles.button} disabled={busy} onClick={() => { if (window.confirm("이 예약을 노쇼로 처리할까요?")) void update(`/admin/seat-reservations/${r.id}/no-show`); }}>노쇼 처리</button>
    </> : null;
  }
  return <section className={`${styles.card} ${operations.workspace}`}>
    <h1>지점 운영 관리</h1>
    <p>담당 지점의 메뉴 판매 상태와 좌석·예약을 관리합니다.</p>
    <button className={styles.button} disabled={busy} onClick={() => setVersion(v => v + 1)}>새로고침</button>
    {loadError ? <p role="alert">{loadError}</p> : !branches ? <p role="status">담당 지점 확인 중…</p> : branches.length === 0 ? <p>배정된 지점이 없습니다. 본사 관리자에게 문의해주세요.</p> : <>
      <label className={styles.field}>담당 지점<select disabled={busy} value={selected} onChange={e => { setBranchId(e.target.value); setRepairCode(""); setChairNo(0); setMessage(""); }}>
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></label>
      <div className={operations.tabs} role="group" aria-label="지점 업무 선택">
        <button className={styles.button} aria-pressed={tab === "seats"} onClick={() => setTab("seats")}>좌석·예약</button>
        <button className={styles.button} aria-pressed={tab === "menus"} onClick={() => setTab("menus")}>메뉴 판매</button>
        <button className={styles.button} aria-pressed={tab === "logs"} onClick={() => setTab("logs")}>작업 이력</button>
      </div>
      {!current ? <p role="status">업무 정보를 불러오는 중…</p> : current.error ? <p role="alert">{current.error}</p> : <>
        {tab === "menus" && <section className={styles.section}><h2>메뉴 판매 상태</h2>
          {current.menus.length === 0 && <p>등록된 메뉴가 없습니다.</p>}
          {current.menus.map(m => <label className={styles.field} key={m.menuId}>{m.nameKor}
            <select aria-label={`${m.nameKor} 판매 상태`} disabled={busy} value={m.status} onChange={e => void update(`${base}/menus/${m.menuId}/status`, { status: e.target.value })}>
              {(Object.keys(saleNames) as SaleStatus[]).map(s => <option key={s} value={s}>{saleNames[s]}</option>)}
            </select>
          </label>)}
        </section>}
        {tab === "logs" && <section className={styles.section}><h2>관리 작업 이력</h2><p>담당 지점의 최근 100건입니다. 기능 적용 이후의 변경부터 기록됩니다.</p>
          {current.logs.length === 0 ? <p>기록된 작업이 없습니다.</p> : <ul className={operations.logList}>{current.logs.map(log => <li key={log.id}>
            <time dateTime={log.occurredAt}>{new Date(log.occurredAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</time>
            <p>{log.actorLoginId} · {actionNames[log.action] ?? log.action} · {log.target}</p>
            <p>{logValues[log.beforeValue] ?? log.beforeValue} → {logValues[log.afterValue] ?? log.afterValue}</p>
          </li>)}</ul>}
        </section>}
      </>}
      {tab === "seats" && <section className={styles.section}><h2>좌석·예약 관리</h2>
        <label className={styles.field}>조회 날짜<input type="date" value={day ?? ""} disabled={busy} onChange={e => setDate(e.target.value)} /></label>
        {current && !current.error && day && <>
          <p>배치도의 의자를 누르면 해당 자리의 예약 확인과 개별 의자·테이블 전체 수리를 설정할 수 있습니다.</p>
          <div className={operations.seatWorkspace}>
            <div className={operations.seatMap}><AdminSeatMap key={`${selected}/${day}`} branchId={selected} branchName={branches.find(b => b.id === selected)?.name ?? selected} date={day} version={version} selectedCode={repairCode} selectedChairNo={chairNo} busy={busy} onSelect={(code, no) => { setRepairCode(code); setChairNo(no); }} /></div>
            <RepairControl code={repairCode} chairNo={chairNo} onSelect={(code, no) => { setRepairCode(code); setChairNo(no); }} seats={current.seats} busy={busy} onRepair={(s, no) => void prepareRepair(s, no)}>
              {repairCode && <section aria-label="선택 좌석 예약"><h3>{selectedLabel} 예약 · {day}</h3>
                {selectedReservations.length === 0 ? <p>해당 날짜에 이 자리의 예약이 없습니다.</p> : selectedReservations.map(r => <div key={r.id}><p>#{r.id} {r.memberNickname} · {r.start}~{r.end} · {r.people}명 · {statusNames[r.status] ?? r.status}</p>{reservationActions(r)}</div>)}
              </section>}
            </RepairControl>
          </div>
        </>}
        {current && !current.error && <>
          <h3>당일 예약 목록</h3>
          {current.reservations.length === 0 && <p>해당 날짜에 예약이 없습니다.</p>}
          {current.reservations.map(r => <div key={r.id}>
            <p>#{r.id} {r.memberNickname} · {r.start}~{r.end} · {r.people}명 · {r.chairLabels.join(", ") || "예약 대기"} · {statusNames[r.status] ?? r.status}</p>
            {reservationActions(r)}
          </div>)}
        </>}
      </section>}
    </>}
    {message && <p role="status">{message}</p>}
    {confirmation && <RepairDialog confirmation={confirmation} busy={busy} onCancel={() => setConfirmation(null)} onConfirm={() => {
      const pending = confirmation; setConfirmation(null);
      void update(pending.path, { underRepair: true, acknowledgedReservationIds: pending.reservations.map(r => r.id) });
    }} />}
  </section>;
}

function RepairControl({ code, chairNo, onSelect, seats, busy, onRepair, children }: { code: string; chairNo: number; onSelect: (code: string, chairNo: number) => void; seats: Seat[]; busy: boolean; onRepair: (seat: Seat, no?: number) => void; children: React.ReactNode }) {
  const seat = seats.find(s => s.code === code) ?? seats[0];
  if (!seat) return null;
  return <div className={operations.seatActions}>
    <h3>선택 좌석 관리</h3>
    <p role="status">{code ? `${seat.code}${chairNo ? ` ${chairNo}번` : " 전체"} 선택됨` : "배치도에서 관리할 자리를 눌러주세요."}</p>
    <label className={styles.field}>관리할 좌석<select value={seat.code} disabled={busy} onChange={e => onSelect(e.target.value, 0)}>
      {seats.map(s => <option key={s.code} value={s.code}>{s.code} · {s.capacity}인 · {s.underRepair ? "수리 중" : "정상"}</option>)}
    </select></label>
    <label className={styles.field}>의자 선택<select value={chairNo} disabled={busy} onChange={e => onSelect(seat.code, Number(e.target.value))}>
      <option value={0}>전체 테이블·바석</option>
      {Array.from({ length: seat.capacity }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}번{seat.underRepair || seat.repairChairNos.includes(i + 1) ? " · 수리 중" : " · 정상"}</option>)}
    </select></label>
    <p>{seat.code} · {seat.capacity}자리 · {seat.underRepair ? "전체 수리 중" : seat.repairChairNos.length ? `의자 ${seat.repairChairNos.join(", ")}번 수리 중` : "정상 운영"}</p>
    {chairNo > 0 && <button className={styles.button} disabled={busy || seat.underRepair} onClick={() => onRepair(seat, chairNo)}>{seat.code} {chairNo}번 {seat.repairChairNos.includes(chairNo) ? "수리 해제" : "수리 설정"}</button>}
    {seat.underRepair && chairNo > 0 && <p>개별 의자를 관리하려면 전체 수리를 먼저 해제해주세요.</p>}
    <button className={styles.button} disabled={busy} onClick={() => onRepair(seat)}>{seat.code} {seat.underRepair ? "수리 해제" : "수리 설정"}</button>
    <p>전체 수리 해제 후에도 개별 의자 수리 상태는 유지됩니다. 기존 예약은 자동 취소되지 않습니다.</p>
    {children}
  </div>;
}

function RepairDialog({ confirmation, busy, onCancel, onConfirm }: { confirmation: RepairConfirmation; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={operations.repairDialog} aria-labelledby="repair-confirm-title" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="repair-confirm-title">예약이 있는 자리입니다</h2>
    <p>{confirmation.label} 수리 설정 시 아래 예약에 안내가 필요합니다. 조회 날짜와 관계없이 진행 중·예정된 예약을 모두 표시합니다.</p>
    <ul>{confirmation.reservations.map(r => <li key={r.id}>#{r.id} {r.date} {r.start}~{r.end} · {r.memberNickname} · {r.people}명 · {r.chairLabels.join(", ")}</li>)}</ul>
    <p>예약은 유지되며 새 예약이 차단됩니다. 손님에게 자리 변경 등을 안내한 뒤 진행해주세요.</p>
    <div className={operations.tabs}><button className={styles.button} disabled={busy} onClick={onCancel} autoFocus>돌아가기</button><button className={styles.button} disabled={busy} onClick={onConfirm}>예약 확인 후 수리 설정</button></div>
  </dialog>;
}
