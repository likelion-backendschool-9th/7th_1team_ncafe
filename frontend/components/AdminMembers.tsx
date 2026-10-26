"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import MemberFields, { profileFromForm } from "./MemberFields";
import { ApiError, memberApi, type Member } from "@/lib/memberApi";
import styles from "./member.module.css";
import adminStyles from "@/app/admin/_components/admin.module.css";
import { isHeadOffice } from "@/app/admin/_components/AdminAccess";

const basePath = "/admin/branches/members";
const roleName = (role: string) => role === "USER" ? "일반 회원" : isHeadOffice(role) ? "본사 관리자" : "지점 관리자";
export default function AdminMembers({ mode }: { mode: "list" | "create" | "detail" | "update" | "delete" }) {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();
  const { member: currentMember, refresh } = useAuth();
  const canManage = isHeadOffice(currentMember?.role);
  const [members, setMembers] = useState<Member[]>([]);
  const [target, setTarget] = useState<Member | null>(null);
  const [loading, setLoading] = useState(mode !== "create");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (mode === "create") return;
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        if (mode === "list") {
          const result = await memberApi<Member[]>("/admin/members");
          if (active) setMembers(result);
        } else {
          const result = await memberApi<Member>(`/admin/members/${id}`);
          if (active) setTarget(result);
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await refresh();
        if (active) setError(e instanceof Error ? e.message : "회원을 불러오지 못했습니다.");
      }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [id, mode, retry, refresh]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "delete") {
        await memberApi(`/admin/members/${id}`, "DELETE");
        router.replace(basePath); return;
      }
      const body = profileFromForm(data);
      if (mode === "create") {
        if (data.get("password") !== data.get("confirmation")) throw new Error("비밀번호 확인이 일치하지 않습니다.");
        Object.assign(body, { loginId: String(data.get("loginId")).trim(), password: data.get("password") });
      }
      const result = await memberApi<Member>(mode === "create" ? "/admin/members/create" : `/admin/members/${id}`, mode === "create" ? "POST" : "PATCH", body);
      router.replace(`${basePath}/${result.no}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await refresh();
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally { setPending(false); }
  }
  const title = { list: "회원 목록", create: "회원 추가", detail: "회원 상세", update: "회원 수정", delete: "회원 삭제" }[mode];
  const filtered = members.filter(member => `${member.no} ${member.loginId} ${member.nickname} ${member.email ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <section><h1 className={adminStyles.pageTitle}>{title}</h1>
    <p>{canManage ? "본사 관리자 · 전체 회원 관리" : "지점 관리자 · 회원 조회 전용"}</p>
    <div className={styles.links}><Link href={basePath}>회원 목록</Link>{mode === "list" && canManage && <Link className={styles.button} href={`${basePath}/create`}>회원 추가</Link>}</div>
    {loading && <p role="status">회원을 불러오고 있습니다…</p>}
    {error && <div><p className={styles.error} role="alert">{error}</p>{!pending && mode !== "create" && <button onClick={() => setRetry(value => value + 1)}>다시 조회</button>}</div>}
    {!loading && mode === "list" && <>
      <label className={styles.field}>회원 검색<input value={query} onChange={e => setQuery(e.target.value)} placeholder="회원번호, 아이디, 닉네임, 이메일" /></label>
      <p>{filtered.length}명</p>
      <div style={{ overflowX: "auto" }}><table className={adminStyles.table}><thead><tr><th>번호</th><th>아이디</th><th>닉네임</th><th>이메일</th><th>권한</th><th>상세</th></tr></thead><tbody>{filtered.map(member => <tr key={member.no}><td data-label="번호">{member.no}</td><td data-label="아이디">{member.loginId}</td><td data-label="닉네임">{member.nickname}</td><td data-label="이메일">{member.email || "—"}</td><td data-label="권한">{roleName(member.role)}</td><td data-label="상세"><Link href={`${basePath}/${member.no}`}>상세 보기</Link></td></tr>)}</tbody></table></div>
      {!error && filtered.length === 0 && <p>조회된 회원이 없습니다.</p>}
    </>}
    {!loading && mode === "detail" && target && <>
      <dl className={styles.details}>{Object.entries({ 회원번호: target.no, 아이디: target.loginId, 닉네임: target.nickname, 권한: roleName(target.role), 등급: target.gradeId, 생일: target.birth, 성별: target.gender, 전화번호: target.phoneNumber, 이메일: target.email, 우편번호: target.postcode, 주소: target.address1, 상세주소: target.address2, 쿠폰: target.couponCount, 연패수: target.loseStreak, 가입일: target.joinDate }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
      {canManage && <div className={styles.links}><Link className={styles.button} href={`${basePath}/${target.no}/update`}>회원 수정</Link><Link className={`${styles.button} ${styles.danger}`} href={`${basePath}/${target.no}/delete`}>회원 삭제</Link></div>}
    </>}
    {!loading && (mode === "create" || (target && (mode === "update" || mode === "delete"))) && <form className={styles.form} onSubmit={save} aria-busy={pending}>
      {mode === "delete" ? <><h2>{target?.nickname} 회원을 삭제하시겠습니까?</h2><p>회원 개인정보가 제거되고 기존 로그인 세션이 차단됩니다. 되돌릴 수 없습니다.</p><label><input type="checkbox" required />삭제 내용을 확인했습니다.</label></> : <>
        {mode === "create" && <><label className={styles.field}>아이디 *<input name="loginId" required pattern="[A-Za-z0-9_]{4,20}" title="영문·숫자·밑줄 4~20자" autoComplete="off" /></label><label className={styles.field}>초기 비밀번호 *<input type="password" name="password" required minLength={8} maxLength={64} autoComplete="new-password" /></label><label className={styles.field}>비밀번호 확인 *<input type="password" name="confirmation" required autoComplete="new-password" /></label></>}
        <MemberFields key={target?.no ?? "create"} member={target ?? undefined} />
      </>}
      <div className={styles.links}><button className={`${styles.button} ${mode === "delete" ? styles.danger : ""}`} disabled={pending}>{pending ? "처리 중…" : mode === "delete" ? "삭제 확정" : "회원 저장"}</button><Link href={target ? `${basePath}/${target.no}` : basePath}>취소</Link></div>
    </form>}
  </section>;
}
