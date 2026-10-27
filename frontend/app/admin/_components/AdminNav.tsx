"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import styles from "./admin.module.css";
import { useAuth } from "@/components/AuthProvider";
import { isHeadOffice } from "./AdminAccess";

const NAV = [
  { href: "/admin/branches", label: "지점 관리", en: "BRANCHES", icon: "🏬" },
  { href: "/admin/members", label: "회원 관리", en: "MEMBERS", icon: "👤" },
  { href: "/admin/menus", label: "메뉴 관리", en: "MENUS", icon: "☕" },
  { href: "/admin/categories", label: "카테고리 관리", en: "CATEGORIES", icon: "🗂" },
  { href: "/admin/race", label: "경주 관리", en: "RACE", icon: "🏇" },
  { href: "/admin/event", label: "이벤트 관리", en: "EVENT", icon: "🎟" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { member, logout } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const headOffice = isHeadOffice(member?.role);
  async function signOut() {
    setPending(true); setError("");
    try { await logout(); router.replace("/login"); }
    catch (e) { setError(e instanceof Error ? e.message : "로그아웃하지 못했습니다."); }
    finally { setPending(false); }
  }

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin/branches/members" className={styles.brand} aria-label="manhattaN cafe 관리자 홈">
        {/* 어두운 사이드바에서는 기본 0.2 사선이 묻혀 조금 진하게 */}
        <BrandLogo className={styles.brandLogo} slashOpacity={0.3} />
        <span className={styles.brandSub}>{headOffice ? "본사 관리자" : "지점 관리자"}</span>
      </Link>

      <nav aria-label="관리자 메뉴">
        <ul className={styles.navList}>
          {NAV.filter(item => headOffice || item.href.startsWith("/admin/branches/")).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.navItem}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              >
                <span aria-hidden>{item.icon}</span>
                <span className={styles.navText}>
                  {item.label}
                  <span className={styles.navEn}>{item.en}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.toSite}>
        <Link href="/">← 사용자 사이트로</Link>
        <button type="button" className={styles.adminLogout} disabled={pending} onClick={() => void signOut()}>{pending ? "처리 중…" : "로그아웃"}</button>
        {error && <p role="alert">{error}</p>}
      </div>
    </aside>
  );
}
