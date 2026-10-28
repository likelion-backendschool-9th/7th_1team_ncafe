"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import HorseAvatar from "./HorseAvatar";
import MemberFields, { profileFromForm } from "./MemberFields";
import Scoreboard from "./Scoreboard";
import { useUser } from "./UserProvider";
import { ApiError, memberApi, type Member } from "@/lib/memberApi";
import { useMyGrade } from "@/app/(site)/menu/_hooks/useMyGrade";
import { SectionHead } from "@/app/(site)/my/_components/MySection";
import { serial } from "@/app/(site)/my/_lib/format";
import styles from "./member.module.css";
import my from "@/app/(site)/my/_components/my.module.css";
/** 마이페이지 맨 위 — 티켓 요약(프로필 ┊ 쿠폰 · 찜 · 주문 전광판) + 회원정보 설정 2단(회원정보 | 비밀번호 · 탈퇴) */
export default function MemberAccount() {
  const { member, loading, error: loadError, setMember, refresh, logout } = useAuth();
  const { favorites, orders } = useUser();
  // 등급은 지금까지 받은 쿠폰(누적)으로 매긴다 — 이름 · 누적 · 다음 등급까지 남은 장수
  const { grade, next, totalEarned } = useMyGrade();
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
  if (loading) return <div className={my.empty}><p role="status">회원정보를 확인하고 있습니다…</p></div>;
  if (loadError) return <div className={my.empty}><p role="alert">{loadError}</p><button className="btn btn-outline btn-sm" onClick={() => void refresh()}>다시 시도</button></div>;
  if (!member) return <div className={my.empty}>
    {message && <p className={styles.success} role="status">{message}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    <strong>로그인이 필요해요</strong><p>로그인하면 회원정보를 확인하고 수정할 수 있어요.</p>
    <div className={my.guestActions}><Link className="btn" href="/login">로그인</Link><Link className="btn btn-outline" href="/signup">회원가입</Link></div>
  </div>;
  const stats = [
    { href: "#coupons", label: "보유 쿠폰", value: member.couponCount, unit: "장" },
    { href: "#favorites", label: "찜한 메뉴", value: favorites.length, unit: "개" },
    { href: "#orders", label: "주문 내역", value: orders.length, unit: "건" },
  ];
  return <>
    <section className={my.overview} aria-labelledby="my-info-title">
      <div className={my.profile}>
        <HorseAvatar color="#c98a3a" number={member.no} emblem="☕" size={88} />
        <div className={my.profileText}>
          <span className={my.memberNo}>MEMBER No.{serial(member.no)}</span>
          <h2 id="my-info-title" className={my.nickname}>{member.nickname}<span className={my.nicknameSuffix}>님</span></h2>
          <p className={my.grade}>
            <strong className={my.gradeName}>{grade?.name ?? (member.gradeId == null ? "등급 미지정" : "-")}</strong>
            <span>누적 {totalEarned}장</span>
            {grade && <span>{next ? `${next.name}까지 ${next.minTotalCoupons - totalEarned}장` : "최고 등급이에요"}</span>}
          </p>
          <p className={my.profileMeta}>{member.loginId} · {new Date(member.joinDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 가입</p>
          <button className={`btn btn-outline btn-sm ${my.logout}`} disabled={pending} onClick={() => void perform(async () => { await logout(); setMessage("로그아웃했습니다."); })}>로그아웃</button>
        </div>
      </div>
      <ul className={my.stats}>
        {stats.map(s => <li key={s.href}><a href={s.href} className={my.stat}>
          <span className={my.statLabel}>{s.label}</span>
          <span className={my.statValue}><Scoreboard value={serial(s.value, 2)} size="md" label={`${s.label} ${s.value}${s.unit}`} /><span className={my.statUnit} aria-hidden>{s.unit}</span></span>
        </a></li>)}
      </ul>
    </section>
    <section id="account" className={my.section} aria-labelledby="account-title">
      <SectionHead id="account" label="ACCOUNT" title="회원정보 설정" />
      {error && <p className={`${my.notice} ${my.noticeError}`} role="alert">{error}</p>}{message && <p className={my.notice} role="status">{message}</p>}
      <div className={my.settings}>
        <form className={my.panel} aria-busy={pending} onSubmit={e => submit(e, async data => {
          setMember(await memberApi<Member>(`/me/${member.no}`, "PATCH", profileFromForm(data))); setMessage("회원정보를 저장했습니다.");
        })}>
          <div className={my.panelHead}><h3>회원정보 수정</h3><p>* 표시는 꼭 입력해주세요.</p></div>
          <div className={my.fieldGrid}><MemberFields key={member.no} member={member} /></div>
          <div className={my.panelFoot}><p>생년월일을 지우면 기존 값이 유지됩니다.</p><button className={styles.button} disabled={pending}>정보 저장</button></div>
        </form>
        <div className={my.settingsSide}>
          <form className={my.panel} onSubmit={e => submit(e, async data => {
            if (data.get("newPassword") !== data.get("confirmation")) throw new Error("새 비밀번호 확인이 일치하지 않습니다.");
            if (new TextEncoder().encode(String(data.get("newPassword"))).length > 72) throw new Error("새 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.");
            await memberApi(`/me/${member.no}/password`, "PATCH", { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") });
            setMember(null); setMessage("비밀번호가 변경됐습니다. 새 비밀번호로 로그인해주세요.");
          })}>
            <div className={my.panelHead}><h3>비밀번호 변경</h3><p>변경 후에는 새 비밀번호로 다시 로그인해주세요.</p></div>
            <div className={my.fieldGrid}>
              <label className={`${styles.field} ${my.wide}`}>현재 비밀번호<input type="password" name="currentPassword" required autoComplete="current-password" /></label>
              <label className={styles.field}>새 비밀번호<input type="password" name="newPassword" required minLength={8} maxLength={64} autoComplete="new-password" /></label>
              <label className={styles.field}>새 비밀번호 확인<input type="password" name="confirmation" required autoComplete="new-password" /></label>
            </div>
            <div className={my.panelFoot}><button className={styles.button} disabled={pending}>비밀번호 변경</button></div>
          </form>
          <form className={my.panel} onSubmit={e => submit(e, async data => {
            if (!window.confirm("정말 탈퇴하시겠습니까? 개인정보가 삭제됩니다.")) return;
            await memberApi(`/me/${member.no}`, "DELETE", { password: data.get("password") });
            setMember(null); setMessage("회원탈퇴가 완료됐습니다.");
          })}>
            <div className={my.panelHead}><h3>회원탈퇴</h3><p>탈퇴하면 로그인할 수 없으며 회원 개인정보가 삭제됩니다.</p></div>
            <div className={my.withdrawRow}>
              <label className={styles.field}>현재 비밀번호<input type="password" name="password" required autoComplete="current-password" /></label>
              <button className={`${styles.button} ${styles.danger}`} disabled={pending}>회원탈퇴</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </>;
}
