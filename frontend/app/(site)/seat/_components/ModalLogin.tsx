"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { memberApi, type Member } from "@/lib/memberApi";
import styles from "./seat.module.css";

interface ModalLoginProps {
  submitLabel: string; // "로그인하고 예약하기"
  busyLabel: string; // 로그인한 뒤 예약 · 신청을 보내는 동안 — "예약하는 중…"
  busy: boolean; // 예약 · 신청을 보내는 중
  onCancel: () => void;
  onLoggedIn: () => void; // 로그인 직후 — 직전에 누른 예약 · 신청을 이어서 보낸다
}

/**
 * 모달 안 로그인 — 예약 안내 · 예약대기 모달에서 로그인하지 않았을 때 [확인] 버튼 자리에 보인다.
 * 로그인 페이지로 옮기지 않으므로 고른 날짜 · 지점 · 시간대 · 의자가 그대로 남고, 로그인하면 바로 onLoggedIn 으로 이어 보낸다.
 * 로그인 자체는 /login(MemberEntry)과 같은 API · 규칙이다 — 성공하면 AuthProvider 의 회원을 바꿔 헤더 · 내 예약도 따라온다.
 */
export default function ModalLogin({ submitLabel, busyLabel, busy, onCancel, onLoggedIn }: ModalLoginProps) {
  const { setMember } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      const member = await memberApi<Member>("/auth/login", "POST", {
        loginId: String(data.get("loginId")).trim(),
        password: String(data.get("password")),
      });
      setMember(member);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    } finally {
      setPending(false);
    }
    onLoggedIn();
  }

  const locked = pending || busy;

  return (
    <form className={styles.modalLogin} onSubmit={submit} aria-busy={locked}>
      <p className={styles.modalLoginLead}>로그인하면 고른 내용 그대로 바로 이어서 진행돼요.</p>
      <label className={styles.modalLoginField}>
        아이디
        <input name="loginId" required autoComplete="username" autoFocus disabled={locked} />
      </label>
      <label className={styles.modalLoginField}>
        비밀번호
        <input name="password" type="password" required autoComplete="current-password" disabled={locked} />
      </label>

      {error && (
        <p className={styles.confirmError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.confirmActions}>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={locked}>
          취소
        </button>
        <button type="submit" className="btn btn-gold" disabled={locked}>
          {pending ? "로그인하는 중…" : busy ? busyLabel : submitLabel}
        </button>
      </div>
      <p className={styles.modalLoginLinks}>
        처음이신가요? <Link href="/signup">회원가입</Link>
      </p>
    </form>
  );
}
