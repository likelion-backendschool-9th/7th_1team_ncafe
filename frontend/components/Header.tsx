"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUser } from "./UserProvider";
import styles from "./layout.module.css";

const NAV = [
  { href: "/", label: "HOME", ko: "홈" },
  { href: "/menu", label: "MENU", ko: "메뉴" },
  { href: "/seat", label: "SEAT", ko: "좌석" },
  { href: "/race", label: "RACE", ko: "경주" },
  { href: "/event", label: "EVENT", ko: "이벤트" },
];

export default function Header() {
  const pathname = usePathname();
  const { coupons } = useUser();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // 경로가 바뀌면 모바일 메뉴를 닫는다(렌더 중 상태 보정).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" className={styles.logo} aria-label="NCafe Racecourse 홈">
          <LogoMark />
          <span className={styles.logoText}>
            <span className={styles.logoName}>NCAFE</span>
            <span className={styles.logoSub}>RACECOURSE</span>
          </span>
        </Link>

        <nav id="site-nav" className={`${styles.nav} ${open ? styles.navOpen : ""}`} aria-label="주 메뉴">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.navLink}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                >
                  {item.label}
                  <span className={styles.navKo}>{item.ko}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.utility}>
          <Link href="/event" className={styles.coupon} aria-label={`내 쿠폰 ${coupons}장 — 이벤트 페이지로 이동`}>
            <TicketIcon />
            <span className={styles.couponText}>
              <strong className={styles.couponCount}>{coupons}</strong>장
            </span>
          </Link>

          <button
            type="button"
            className={styles.burger}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

/** 말발굽 + 커피잔 로고 — 짙은 초록 원 위에 흰 말발굽 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#0f2a1d" />
      <path d="M12 25.5 C12 13.5, 28 13.5, 28 25.5" fill="none" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="13.4" cy="20.5" r="0.9" fill="#0f2a1d" />
      <circle cx="26.6" cy="20.5" r="0.9" fill="#0f2a1d" />
      <circle cx="16" cy="15.8" r="0.9" fill="#0f2a1d" />
      <circle cx="24" cy="15.8" r="0.9" fill="#0f2a1d" />
      <path d="M15.5 24.5 h9 v3 a3.5 3.5 0 0 1 -3.5 3.5 h-2 a3.5 3.5 0 0 1 -3.5 -3.5 z" fill="#8cc4a6" />
      <path d="M24.5 25.5 h1.4 a1.4 1.4 0 0 1 0 2.8 h-1.4" fill="none" stroke="#8cc4a6" strokeWidth="1.2" />
    </svg>
  );
}

/** 쿠폰(경마 티켓) 아이콘 */
function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M2 5.5 A1.5 1.5 0 0 0 2 8 v0 a1.5 1.5 0 0 0 0 2.5 V12 h12 v-1.5 a1.5 1.5 0 0 1 0 -2.5 v0 a1.5 1.5 0 0 1 0 -2.5 V4 H2 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.5 4 v8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
    </svg>
  );
}
