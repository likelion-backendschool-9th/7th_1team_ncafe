"use client";

import Image from "next/image";
import Link from "next/link";
import TicketBadge from "@/components/TicketBadge";
import { pickLineup } from "../_lib/lineup";
import { useBranchStatuses, useSelectedBranch, withBranchStatuses } from "../menu/_hooks/useMenuBranch";
import type { Menu } from "../menu/_types";
import styles from "./menuLineup.module.css";

/** PC 4열 × 2줄 */
const LINEUP_SIZE = 8;

/**
 * 메인 라인업 그리드 — 고른 지점(메뉴판에서 고른 지점, 사이트 공통)의 품절 · 숨김을 입혀 고른다.
 * 숨긴 메뉴는 빠지고 품절은 제자리에서 SOLD OUT 으로 보인다. 지점 상태를 받기 전에는 받아 온 메뉴 그대로 고른다(정적 셸과 같다).
 */
export default function LineupGrid({ menus, categoryNames }: { menus: Menu[]; categoryNames: Record<number, string> }) {
  const branch = useSelectedBranch();
  const { statuses } = useBranchStatuses(branch?.id ?? null);
  const lineup = pickLineup(withBranchStatuses(menus, statuses), LINEUP_SIZE);

  return (
    <ul className={styles.grid}>
      {lineup.map((menu) => (
        <li key={menu.id}>
          <LineupCard menu={menu} category={categoryNames[menu.categoryId] ?? ""} />
        </li>
      ))}
    </ul>
  );
}

function LineupCard({ menu, category }: { menu: Menu; category: string }) {
  const soldOut = menu.status === "SOLD_OUT";

  return (
    <Link href={`/menu/${menu.id}`} className={`${styles.card} ${soldOut ? styles.cardSoldOut : ""}`}>
      <div className={styles.thumb}>
        <Image src={menu.image} alt="" width={240} height={240} className={styles.thumbImg} />
        {menu.badge && (
          <span className={styles.badge}>
            <TicketBadge tone={menu.badge} />
          </span>
        )}
        {soldOut && <span className={styles.soldOut}>SOLD OUT</span>}
      </div>
      <div className={styles.body}>
        <span className={styles.category}>{category}</span>
        <strong className={styles.name}>{menu.name}</strong>
        <span className={styles.eng}>{menu.engName}</span>
        {/* 사이즈가 있는 음료는 S 가격부터 — 사이즈별 가격은 메뉴판·상세에서 */}
        <span className={styles.price}>
          {menu.price.toLocaleString("ko-KR")}원{menu.sizePrices && "~"}
        </span>
      </div>
    </Link>
  );
}
