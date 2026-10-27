import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { MENU_CACHE_TAG } from "../menu/_lib/menuCache";
import { getCategories, getMenus } from "../menu/_lib/menuService";
import LineupGrid from "./LineupGrid";
import styles from "./menuLineup.module.css";

/**
 * 메인 "TODAY'S LINEUP" — 배지(WINNER·BEST·NEW) 메뉴를 4열 정사각 썸네일 그리드로 보여 준다.
 * 데이터는 메뉴 라우트의 Service 만 거친다. 카드는 그 메뉴의 상세(/menu/[id])로 이동한다.
 *
 * "use cache": 모두에게 같은 내용이라 결과를 캐시해 정적 셸에 포함시킨다. Suspense 로 감싸지 않아야
 * 첫 HTML 에 바로 보인다(감싸면 하이드레이션 전까지 fallback 이 보인다).
 * API 를 붙인 뒤에도 메뉴는 자주 바뀌지 않으므로 그대로 두고, 관리자 저장 시 revalidateTag 로 갱신하면 된다.
 * 고를 메뉴는 고른 지점의 품절 · 숨김에 따라 달라지므로, 선정과 카드 그리기는 브라우저 쪽 LineupGrid 가 한다.
 */
export default async function MenuLineup() {
  "use cache";
  cacheLife("hours");
  cacheTag(MENU_CACHE_TAG); // 관리자가 메뉴 · 카테고리를 바꾸면 app/api/menu-cache 가 무효화한다

  const [menus, categories] = await Promise.all([getMenus(), getCategories()]);
  const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <section className={`container ${styles.section}`} aria-labelledby="lineup-title">
      <LineupHead />
      <LineupGrid menus={menus} categoryNames={categoryNames} />
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
