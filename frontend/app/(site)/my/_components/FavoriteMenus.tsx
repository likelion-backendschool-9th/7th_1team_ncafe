"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/components/UserProvider";
import { useBranchStatuses, useSelectedBranch, withBranchStatuses } from "../../menu/_hooks/useMenuBranch";
import type { Menu } from "../../menu/_types";
import { useShowMore } from "../_hooks/useShowMore";
import { won } from "../_lib/format";
import { SectionEmpty, SectionHead, ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 4;

/**
 * 찜한 메뉴 — 최근 찜한 순 카드. 찜 · 해제는 메뉴 상세의 ♡ 버튼에서만 한다(카드를 누르면 상세로).
 * menus 는 page 가 메뉴 Service 에서 받아 온 "메뉴판에 보이는 메뉴" — 숨김 처리된 메뉴는 찜해 두었어도 보이지 않는다.
 * 품절 · 숨김은 고른 지점(메뉴판에서 고른 지점, 사이트 공통) 기준이다.
 */
export default function FavoriteMenus({ menus }: { menus: Menu[] }) {
  const { favorites } = useUser();
  const branch = useSelectedBranch();
  const { statuses } = useBranchStatuses(branch?.id ?? null);
  const byId = new Map(withBranchStatuses(menus, statuses).map((m) => [m.id, m]));
  const items = favorites.map((id) => byId.get(id)).filter((m): m is Menu => m !== undefined);
  const { visible, expanded, hasMore, total, toggle } = useShowMore(items, PREVIEW);

  return (
    <section id="favorites" className={styles.section} aria-labelledby="favorites-title">
      <SectionHead id="favorites" label="MY PICKS" title="찜한 메뉴" meta={`${items.length}개`} />

      {items.length === 0 ? (
        <SectionEmpty
          title="찜한 메뉴가 없어요"
          action={
            <Link href="/menu" className="btn btn-outline btn-sm">
              메뉴판 보러 가기
            </Link>
          }
        >
          메뉴 상세에서 ♡ 찜하기를 누르면 여기에 모여요.
        </SectionEmpty>
      ) : (
        <>
          <ul id="favorites-list" className={styles.pickGrid}>
            {visible.map((menu) => (
              <li key={menu.id}>
                <PickCard menu={menu} />
              </li>
            ))}
          </ul>
          {hasMore && <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="favorites-list" />}
        </>
      )}
    </section>
  );
}

function PickCard({ menu }: { menu: Menu }) {
  const soldOut = menu.status === "SOLD_OUT";

  return (
    <Link href={`/menu/${menu.id}`} className={`${styles.pick} ${soldOut ? styles.pickSoldOut : ""}`}>
      <span className={styles.pickThumb}>
        <Image src={menu.image} alt="" width={160} height={160} className={styles.pickImg} />
        {soldOut && <span className={styles.pickSoldOutTag}>SOLD OUT</span>}
      </span>
      <span className={styles.pickName}>{menu.name}</span>
      <span className={styles.pickEng}>{menu.engName}</span>
      {/* 사이즈가 있는 음료는 S 가격부터 */}
      <span className={styles.pickPrice}>
        {won(menu.price)}
        {menu.sizePrices && "~"}
      </span>
    </Link>
  );
}
