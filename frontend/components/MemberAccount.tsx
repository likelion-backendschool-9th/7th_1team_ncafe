"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import MemberFields, { profileFromForm } from "./MemberFields";
import { ApiError, memberApi, type Member } from "@/lib/memberApi";
import styles from "./member.module.css";
export default function MemberAccount() {
  const { member, loading, error: loadError, setMember, refresh, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function perform(action: () => Promise<void>) {
    setPending(true); setError(""); setMessage("");
    try { await action(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) await refresh();
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally { setPending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>, action: (data: FormData) => Promise<void>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void perform(async () => { await action(data); });
  }
  if (loading) return <section className={styles.card}><p role="status">회원정보를 확인하고 있습니다…</p></section>;
  if (loadError) return <section className={styles.card}><p role="alert">{loadError}</p><button className={styles.button} onClick={() => void refresh()}>다시 시도</button></section>;
  if (!member) return <section className={styles.card}><h1>마이페이지</h1>{message && <p role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}<p>로그인하면 회원정보를 확인하고 수정할 수 있어요.</p><div className={styles.links}><Link className={styles.button} href="/login">로그인</Link><Link href="/signup">회원가입</Link></div></section>;
  return <section className={styles.card}>
    <h1>{member.nickname}님의 마이페이지</h1>
    <dl className={styles.details}><dt>아이디</dt><dd>{member.loginId}</dd><dt>회원번호</dt><dd>{member.no}</dd><dt>가입일</dt><dd>{new Date(member.joinDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</dd><dt>등급</dt><dd>{member.gradeId === null ? "미지정" : member.gradeId}</dd><dt>보유 쿠폰</dt><dd>{member.couponCount}장</dd></dl>
    <button className={styles.button} disabled={pending} onClick={() => void perform(async () => { await logout(); setMessage("로그아웃했습니다."); })}>로그아웃</button>
    {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}
    <section className={styles.section}><h2>회원정보 수정</h2>
      <form className={styles.form} aria-busy={pending} onSubmit={e => submit(e, async data => {
        setMember(await memberApi<Member>(`/me/${member.no}`, "PATCH", profileFromForm(data))); setMessage("회원정보를 저장했습니다.");
      })}><MemberFields key={member.no} member={member} /><p>생년월일을 지우면 기존 값이 유지됩니다.</p><button className={styles.button} disabled={pending}>정보 저장</button></form>
    </section>
    <section className={styles.section}><h2>비밀번호 변경</h2><p>변경 후에는 새 비밀번호로 다시 로그인해주세요.</p>
      <form className={styles.form} onSubmit={e => submit(e, async data => {
        if (data.get("newPassword") !== data.get("confirmation")) throw new Error("새 비밀번호 확인이 일치하지 않습니다.");
        if (new TextEncoder().encode(String(data.get("newPassword"))).length > 72) throw new Error("새 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.");
        await memberApi(`/me/${member.no}/password`, "PATCH", { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") });
        setMember(null); setMessage("비밀번호가 변경됐습니다. 새 비밀번호로 로그인해주세요.");
      })}>
        <label className={styles.field}>현재 비밀번호<input type="password" name="currentPassword" required autoComplete="current-password" /></label>
        <label className={styles.field}>새 비밀번호<input type="password" name="newPassword" required minLength={8} maxLength={64} autoComplete="new-password" /></label>
        <label className={styles.field}>새 비밀번호 확인<input type="password" name="confirmation" required autoComplete="new-password" /></label>
        <button className={styles.button} disabled={pending}>비밀번호 변경</button>
      </form>
    </section>
    <section className={styles.section}><h2>회원탈퇴</h2><p>탈퇴하면 로그인할 수 없으며 회원 개인정보가 삭제됩니다.</p>
      <form className={styles.form} onSubmit={e => submit(e, async data => {
        if (!window.confirm("정말 탈퇴하시겠습니까? 개인정보가 삭제됩니다.")) return;
        await memberApi(`/me/${member.no}`, "DELETE", { password: data.get("password") });
        setMember(null); setMessage("회원탈퇴가 완료됐습니다.");
      })}>
        <label className={styles.field}>현재 비밀번호<input type="password" name="password" required autoComplete="current-password" /></label>
        <button className={`${styles.button} ${styles.danger}`} disabled={pending}>회원탈퇴</button>
      </form>
    </section>
  </section>;
}
