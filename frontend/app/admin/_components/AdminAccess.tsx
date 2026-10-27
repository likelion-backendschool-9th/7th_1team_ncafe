"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import styles from "@/components/member.module.css";

export function isHeadOffice(role?: string) { return role === "HQ_ADMIN" || role === "ADMIN"; }
export function isAdministrator(role?: string) { return isHeadOffice(role) || role === "BRANCH_ADMIN"; }

export default function AdminAccess({ children }: { children: ReactNode }) {
  const { member, loading, error, refresh } = useAuth();
  const pathname = usePathname();
  if (loading) return <div className={styles.card} role="status">관리자 권한을 확인하고 있습니다…</div>;
  if (error) return <div className={styles.card}><p role="alert">{error}</p><button className={styles.button} onClick={() => void refresh()}>다시 시도</button></div>;
  if (!member) return <div className={styles.card}><h1>관리자 로그인</h1><p>관리자 계정으로 로그인해주세요.</p><Link className={styles.button} href="/login">로그인</Link></div>;
  if (!isAdministrator(member.role)) return <div className={styles.card}><h1>접근 권한이 없습니다</h1><p>관리자 전용 화면입니다.</p><Link href="/my">내 정보로 돌아가기</Link></div>;
  if (!isHeadOffice(member.role) && !pathname.startsWith("/admin/branches/")) {
    return <div className={styles.card}><h1>본사 관리자 전용</h1><p>이 업무는 본사 관리자만 사용할 수 있습니다.</p><Link href="/admin/branches/members">지점 회원관리로 이동</Link></div>;
  }
  if (!isHeadOffice(member.role) && !["/admin/branches/assigned", "/admin/branches/operations"].includes(pathname) && !/^\/admin\/branches\/members(?:\/\d+)?\/?$/.test(pathname)) {
    return <div className={styles.card}><h1>회원 조회 전용</h1><p>회원 추가·수정·삭제는 본사 관리자만 할 수 있습니다.</p><Link href="/admin/branches/members">회원 목록으로 이동</Link></div>;
  }
  return children;
}
