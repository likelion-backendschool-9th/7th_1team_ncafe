"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import MemberFields, { profileFromForm } from "./MemberFields";
import { memberApi, type Member } from "@/lib/memberApi";
import styles from "./member.module.css";
// /login?next=/cart — 로그인한 뒤 돌아갈 화면(장바구니 · 결제 확인 · 관리자 화면). 다른 사이트로 보내지 않게 이 사이트 경로만 받는다
function nextPath(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !/^\/[/\\]/.test(next) ? next : null; // "//…" · "/\…" 는 다른 사이트로 간다
}
export default function MemberEntry({ signup = false }: { signup?: boolean }) {
  const { member, setMember } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (signup && password !== data.get("confirmation")) { setError("비밀번호 확인이 일치하지 않습니다."); return; }
    if (signup && new TextEncoder().encode(password).length > 72) { setError("비밀번호는 UTF-8 기준 72바이트 이하여야 합니다."); return; }
    setPending(true);
    try {
      const result = await memberApi<Member>(signup ? "/auth/signup" : "/auth/login", "POST", { ...(signup ? profileFromForm(data) : {}), loginId: String(data.get("loginId")).trim(), password });
      if (signup) setCreated(true);
      else { setMember(result); router.replace(nextPath() ?? (["ADMIN", "HQ_ADMIN", "BRANCH_ADMIN"].includes(result.role) ? "/admin/branches/members" : "/my")); }
    } catch (e) { setError(e instanceof Error ? e.message : "요청에 실패했습니다."); }
    finally { setPending(false); }
  }
  if (created) return <section className={styles.card}><h1>가입을 환영합니다</h1><p>회원가입이 완료됐습니다. 로그인하고 내 정보를 확인하세요.</p><Link className={styles.button} href="/login">로그인하기</Link></section>;
  if (member) return <section className={styles.card}><h1>이미 로그인되어 있어요</h1><Link href="/my">마이페이지로 이동</Link></section>;
  return <section className={styles.card}>
    <h1>{signup ? "회원가입" : "로그인"}</h1>
    <p>{signup ? "나만의 카페 회원 정보를 등록하세요. * 항목은 필수입니다." : "manhattaN cafe에 다시 오신 것을 환영합니다."}</p>
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <label className={styles.field}>아이디 *<input name="loginId" required autoComplete="username" minLength={signup ? 4 : undefined} maxLength={signup ? 20 : undefined} pattern={signup ? "[A-Za-z0-9_]{4,20}" : undefined} title="영문·숫자·밑줄 4~20자" /></label>
      <label className={styles.field}>비밀번호 *<input name="password" required type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : undefined} maxLength={signup ? 64 : undefined} /></label>
      {signup && <><p>비밀번호는 8~64자, UTF-8 기준 72바이트 이하로 입력하세요.</p><label className={styles.field}>비밀번호 확인 *<input name="confirmation" required type="password" autoComplete="new-password" /></label><MemberFields /></>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.button} disabled={pending}>{pending ? "처리 중…" : signup ? "회원가입" : "로그인"}</button>
    </form>
    <div className={styles.links}><Link href={signup ? "/login" : "/signup"}>{signup ? "이미 회원이신가요? 로그인" : "처음이신가요? 회원가입"}</Link></div>
  </section>;
}
