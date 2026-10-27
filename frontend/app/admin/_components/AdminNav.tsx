"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import styles from "./admin.module.css";

const NAV = [
  { href: "/admin/branches", label: "지점 관리", en: "BRANCHES", icon: "🏬" },
  { href: "/admin/menus", label: "메뉴 관리", en: "MENUS", icon: "☕" },
  { href: "/admin/categories", label: "카테고리 관리", en: "CATEGORIES", icon: "🗂" },
  { href: "/admin/race", label: "경주 관리", en: "RACE", icon: "🏇" },
  { href: "/admin/event", label: "이벤트 관리", en: "EVENT", icon: "🎟" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin/menus" className={styles.brand} aria-label="manhattaN cafe 관리자 홈">
        {/* 어두운 사이드바에서는 기본 0.2 사선이 묻혀 조금 진하게 */}
        <BrandLogo className={styles.brandLogo} slashOpacity={0.3} />
        <span className={styles.brandSub}>ADMIN OFFICE</span>
      </Link>

      <nav aria-label="관리자 메뉴">
        <ul className={styles.navList}>
          {NAV.map((item) => (
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

      <Link href="/" className={styles.toSite}>
        ← 사용자 사이트로
      </Link>
    </aside>
  );
}
