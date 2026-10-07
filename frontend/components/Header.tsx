"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
            <span className={styles.logoSub}>RACECOURSE · EST. 2026</span>
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
    </header>
  );
}

/** 말발굽 + 커피잔 로고 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="19" fill="#0f2a1d" stroke="#c9a227" strokeWidth="1.5" />
      <path d="M11 25 C11 13, 29 13, 29 25" fill="none" stroke="#c9a227" strokeWidth="4" strokeLinecap="round" />
      <circle cx="12.6" cy="20" r="0.9" fill="#0f2a1d" />
      <circle cx="27.4" cy="20" r="0.9" fill="#0f2a1d" />
      <circle cx="15.5" cy="15.2" r="0.9" fill="#0f2a1d" />
      <circle cx="24.5" cy="15.2" r="0.9" fill="#0f2a1d" />
      <path d="M15 23 h10 v3.5 a4 4 0 0 1 -4 4 h-2 a4 4 0 0 1 -4 -4 z" fill="#f3ead3" />
      <path d="M25 24 h1.6 a1.6 1.6 0 0 1 0 3.2 h-1.6" fill="none" stroke="#f3ead3" strokeWidth="1.2" />
    </svg>
  );
}
