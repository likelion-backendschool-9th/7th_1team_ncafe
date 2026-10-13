"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useRacePhase } from "@/lib/useCountdown";
import BrandLogo from "./BrandLogo";
import { useCart } from "./CartProvider";
import { useUser } from "./UserProvider";
import styles from "./layout.module.css";

const NAV = [
  { href: "/", label: "HOME", ko: "홈" },
  { href: "/menu", label: "MENU", ko: "메뉴" },
  { href: "/seat", label: "SEAT", ko: "좌석" },
  { href: "/race", label: "RACE", ko: "경주" },
  { href: "/event", label: "EVENT", ko: "이벤트" },
  { href: "/my", label: "MY", ko: "마이페이지" },
];

export default function Header() {
  const pathname = usePathname();
  const { coupons } = useUser();
  const { count: cartCount } = useCart();
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
        <Link href="/" className={styles.logo} aria-label="manhattaN cafe 홈">
          {/* PC 는 한 줄 워드마크, 모바일(햄버거 메뉴 구간)은 3줄 적층형 — CSS 로 하나만 보인다 */}
          <BrandLogo variant="horizontal" className={styles.logoWide} />
          <BrandLogo variant="stacked" className={styles.logoStacked} />
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
                  {item.href === "/race" && <RaceSignal />}
                  <span className={styles.navKo}>{item.ko}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.utility}>
          {/* 내 쿠폰 → 마이페이지의 쿠폰 섹션 */}
          <Link href="/my#coupons" className={styles.coupon} aria-label={`내 쿠폰 ${coupons}장 — 마이페이지 쿠폰으로 이동`}>
            <TicketIcon />
            <span className={styles.couponText}>
              <strong className={styles.couponCount}>{coupons}</strong>장
            </span>
          </Link>

          {/* 장바구니 → /cart. 숫자는 담은 총 수량이고, 비어 있으면 숫자를 숨긴다. */}
          <Link
            href="/cart"
            className={styles.cart}
            aria-label={`장바구니 ${cartCount}개`}
            aria-current={pathname === "/cart" ? "page" : undefined}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className={styles.cartCount} aria-hidden>
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
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

/**
 * RACE 메뉴의 경주 신호 — 시작 10분 전부터 SOON, 시작 후 10분은 LIVE(lib/time.ts).
 * PC 는 글자 오른쪽 위의 작은 점(LIVE 빨강 · SOON 테두리), 모바일 메뉴는 글자 배지로 보인다.
 * 단계가 바뀔 때만 다시 그린다(useRacePhase) — 헤더 전체가 매초 다시 그려지지 않게.
 */
function RaceSignal() {
  const phase = useRacePhase();
  if (phase !== "LIVE" && phase !== "SOON") return null;

  const live = phase === "LIVE";
  return (
    <span className={`${styles.raceSignal} ${live ? styles.raceLive : styles.raceSoon}`}>
      <span className={styles.raceSignalText}>
        {live ? "LIVE" : "SOON"}
        <span className="visually-hidden">{live ? " — 경주 진행 중" : " — 곧 출발"}</span>
      </span>
    </span>
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

/** 장바구니(쇼핑백) 아이콘 */
function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
