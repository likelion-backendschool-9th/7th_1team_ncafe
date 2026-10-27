import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MenuDetail, { MenuDetailSkeleton } from "../_components/MenuDetail";
import { MENU_CACHE_TAG } from "../_lib/menuCache";
import { parseMenuId, selectDetail } from "../_lib/menuBoard";
import { getCategories, getMenus } from "../_lib/menuService";

/** Menu details render on request, including when the menu database is empty at build time. */

/** 모두에게 같은 내용이라 id 별로 캐시한다(메뉴판과 같은 수명). */
async function loadDetail(param: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(MENU_CACHE_TAG); // 관리자가 메뉴 · 카테고리를 바꾸면 app/api/menu-cache 가 무효화한다

  const id = parseMenuId(param);
  if (id === null) return null;
  const [categories, menus] = await Promise.all([getCategories(), getMenus()]);
  return selectDetail(categories, menus, id);
}

export async function generateMetadata({ params }: PageProps<"/menu/[id]">): Promise<Metadata> {
  const detail = await loadDetail((await params).id);
  return detail ? { title: detail.menu.name, description: detail.menu.description } : {};
}

export default function MenuDetailPage({ params }: PageProps<"/menu/[id]">) {
  return (
    <div className="container page">
      <Suspense fallback={<MenuDetailSkeleton />}>
        <MenuDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function MenuDetailContent({ params }: Pick<PageProps<"/menu/[id]">, "params">) {
  const detail = await loadDetail((await params).id);
  if (!detail) notFound();

  return <MenuDetail {...detail} />;
}
