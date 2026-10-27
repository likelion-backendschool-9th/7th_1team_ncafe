"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { memberApi, type Member } from "@/lib/memberApi";
import { isHeadOffice } from "@/app/admin/_components/AdminAccess";
import styles from "./member.module.css";

interface Branch { id: string; name: string }
interface Assignment { branchId: string; memberNo: number; loginId: string; nickname: string }

export default function BranchAdminAssignments() {
  const { member } = useAuth();
  const hq = isHeadOffice(member?.role);
  const [data, setData] = useState<{ branches: Branch[]; members: Member[]; error: string } | null>(null);
  const [branchId, setBranchId] = useState("");
  const [memberNo, setMemberNo] = useState("");
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ branchId: string; version: number; items: Assignment[]; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = branchId || data?.branches[0]?.id || "";

  useEffect(() => {
    let active = true;
    Promise.all([memberApi<Branch[]>("/branch-admin/branches"), hq ? memberApi<Member[]>("/admin/members") : Promise.resolve([])])
      .then(([branches, members]) => { if (active) setData({ branches, members: members.filter(m => m.role === "BRANCH_ADMIN"), error: "" }); })
      .catch((e: unknown) => { if (active) setData({ branches: [], members: [], error: e instanceof Error ? e.message : "목록을 불러오지 못했습니다." }); });
    return () => { active = false; };
  }, [hq, member?.no, version]);

  useEffect(() => {
    if (!hq || !selected) return;
    let active = true;
    memberApi<Assignment[]>(`/admin/branches/${encodeURIComponent(selected)}/admins`)
      .then(items => { if (active) setResult({ branchId: selected, version, items, error: "" }); })
      .catch((e: unknown) => { if (active) setResult({ branchId: selected, version, items: [], error: e instanceof Error ? e.message : "배정 목록을 불러오지 못했습니다." }); });
    return () => { active = false; };
  }, [selected, hq, version]);

  async function change(no: number, method: "PUT" | "DELETE") {
    if (busy || !selected) return;
    setBusy(true); setMessage("");
    try {
      await memberApi(`/admin/branches/${encodeURIComponent(selected)}/admins/${no}`, method);
      setVersion(v => v + 1);
      setMessage(method === "PUT" ? "관리자를 배정했습니다." : "배정을 해제했습니다.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "변경하지 못했습니다."); }
    finally { setBusy(false); }
  }

  const current = result?.branchId === selected && result.version === version ? result : null;
  return <section className={styles.card}>
    <h1>{hq ? "지점 관리자 배정" : "내 담당 지점"}</h1>
    <button className={styles.button} disabled={busy} onClick={() => setVersion(v => v + 1)}>목록 새로고침</button>
    {!data ? <p role="status">불러오는 중…</p> : data.error ? <p role="alert">{data.error}</p> : <>
      {data.branches.length === 0 && <p>{hq ? "등록된 지점이 없습니다. 지점 관리에서 먼저 등록해주세요." : "배정된 지점이 없습니다. 본사 관리자에게 배정을 요청해주세요."}</p>}
      {!hq && <ul>{data.branches.map(b => <li key={b.id}>{b.name} ({b.id})</li>)}</ul>}
      {hq && selected && <>
        <label className={styles.field}>지점<select value={selected} disabled={busy} onChange={e => { setBranchId(e.target.value); setMessage(""); }}>
          {data.branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}
        </select></label>
        <form onSubmit={e => { e.preventDefault(); if (memberNo) void change(Number(memberNo), "PUT"); }}>
          <label className={styles.field}>지점 관리자<select required value={memberNo} disabled={busy} onChange={e => setMemberNo(e.target.value)}>
            <option value="">계정을 선택해주세요</option>
            {data.members.map(m => <option key={m.no} value={m.no}>{m.nickname} ({m.loginId})</option>)}
          </select></label>
          {data.members.length === 0 && <p>지점 관리자 권한을 가진 계정을 먼저 준비해주세요.</p>}
          <button className={styles.button} disabled={busy || !memberNo || !current || !!current.error}>배정</button>
        </form>
        {!current ? <p role="status">배정 목록을 불러오는 중…</p> : current.error ? <p role="alert">{current.error}</p> : <ul>
          {current.items.length === 0 && <li>배정된 관리자가 없습니다.</li>}
          {current.items.map(a => <li key={a.memberNo}>{a.nickname} ({a.loginId}) <button className={styles.button} disabled={busy} onClick={() => void change(a.memberNo, "DELETE")}>배정 해제</button></li>)}
        </ul>}
      </>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
