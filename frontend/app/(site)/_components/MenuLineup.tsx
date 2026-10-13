import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import TicketBadge from "@/components/TicketBadge";
import { pickLineup } from "../_lib/lineup";
import { getCategories, getMenus } from "../menu/_lib/menuService";
import type { Menu } from "../menu/_types";
import styles from "./menuLineup.module.css";

/** PC 4열 × 2줄 */
const LINEUP_SIZE = 8;

/**
 * 메인 "TODAY'S LINEUP" — 배지(WINNER·BEST·NEW) 메뉴를 4열 정사각 썸네일 그리드로 보여 준다.
 * 데이터는 메뉴 라우트의 Service 만 거친다. 카드는 그 메뉴의 상세(/menu/[id])로 이동한다.
 *
 * "use cache": 모두에게 같은 내용이라 결과를 캐시해 정적 셸에 포함시킨다. Suspense 로 감싸지 않아야
 * 첫 HTML 에 바로 보인다(감싸면 하이드레이션 전까지 fallback 이 보인다).
 * API 를 붙인 뒤에도 메뉴는 자주 바뀌지 않으므로 그대로 두고, 관리자 저장 시 revalidateTag 로 갱신하면 된다.
 */
export default async function MenuLineup() {
  "use cache";
  cacheLife("hours");

  const [menus, categories] = await Promise.all([getMenus(), getCategories()]);
  const lineup = pickLineup(menus, LINEUP_SIZE);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <section className={`container ${styles.section}`} aria-labelledby="lineup-title">
      <LineupHead />
      <ul className={styles.grid}>
        {lineup.map((menu) => (
          <li key={menu.id}>
            <LineupCard menu={menu} category={categoryName.get(menu.categoryId) ?? ""} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LineupHead() {
  return (
    <div className={styles.head}>
      <div>
        <h2 id="lineup-title" className={styles.title}>
          TODAY&apos;S LINEUP
        </h2>
        <p className={styles.subtitle}>오늘의 출전 메뉴 — 가장 많은 선택을 받은 메뉴들을 모았어요.</p>
      </div>
      <Link href="/menu" className={styles.more}>
        전체 메뉴 보기 <span aria-hidden>›</span>
      </Link>
    </div>
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
