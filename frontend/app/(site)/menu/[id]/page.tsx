import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MenuDetail, { MenuDetailSkeleton } from "../_components/MenuDetail";
import { parseMenuId, selectBoard, selectDetail } from "../_lib/menuBoard";
import { getCategories, getMenus } from "../_lib/menuService";

/**
 * 메뉴 상세 — /menu/[id]. 설계: BLUEPRINT 8.4.
 * 메뉴판에 보이는 메뉴는 빌드 때 미리 만든다. 그 밖의 id(새로 등록된 메뉴 등)는 첫 요청 때 만들고,
 * 메뉴판에 없는 메뉴(HIDDEN · 숨김 카테고리 · 없는 id)면 404(같은 폴더의 not-found.tsx).
 *
 * params 는 Suspense 안(MenuDetailContent)에서만 읽는다. partialPrefetching 은 링크마다 같은 App Shell 을
 * 미리 받아 두는데, 밖에서 읽으면 Shell 이 URL 하나에 묶여 "URL data outside of Suspense" 가 뜬다.
 * Shell 에는 스켈레톤이 들어가고, 메뉴 내용은 이동 직후 채워진다(빌드한 id 는 첫 HTML 에 이미 들어 있다).
 */
export async function generateStaticParams() {
  const [categories, menus] = await Promise.all([getCategories(), getMenus()]);
  return selectBoard(categories, menus).menus.map((m) => ({ id: String(m.id) }));
}

/** 모두에게 같은 내용이라 id 별로 캐시한다(메뉴판과 같은 수명). */
async function loadDetail(param: string) {
  "use cache";
  cacheLife("hours");

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
