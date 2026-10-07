"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/Header";
import styles from "./admin.module.css";

const NAV = [
  { href: "/admin/menus", label: "메뉴 관리", en: "MENUS", icon: "☕" },
  { href: "/admin/categories", label: "카테고리 관리", en: "CATEGORIES", icon: "🗂" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin/menus" className={styles.brand}>
        <LogoMark size={34} />
        <span>
          <span className={styles.brandName}>NCAFE</span>
          <span className={styles.brandSub}>ADMIN OFFICE</span>
        </span>
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
