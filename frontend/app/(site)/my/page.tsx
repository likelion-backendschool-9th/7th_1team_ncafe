import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getCategories, getMenus } from "../menu/_lib/menuService";
import FavoriteMenus from "./_components/FavoriteMenus";
import MyCoupons from "./_components/MyCoupons";
import MyEvents from "./_components/MyEvents";
import MemberAccount from "@/components/MemberAccount";
import MyRaces from "./_components/MyRaces";
import MySeats from "./_components/MySeats";
import OrderHistory from "./_components/OrderHistory";

export const metadata: Metadata = { title: "MY PAGE" };

/** Account settings use the shared session; race and event sections load member-specific data on the client. */
export default async function MyPage() {
  "use cache";
  cacheLife("hours");

  const [categories, menus] = await Promise.all([getCategories(), getMenus()]);
  // 찜 목록은 메뉴판에 보이는 메뉴만 — 숨김 메뉴 · 숨김 카테고리는 상세가 없다
  const visibleCategories = new Set(categories.filter((c) => c.visible).map((c) => c.id));
  const pickable = menus.filter((m) => m.status !== "HIDDEN" && visibleCategories.has(m.categoryId));

  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">My Stable</span>
        <h1 className="title-xl">MY PAGE</h1>
        <p className="subtitle">내 정보와 주문 · 찜 · 쿠폰을 한곳에서 확인하세요.</p>
      </div>

      <MemberAccount />
      <OrderHistory />
      <FavoriteMenus menus={pickable} />
      <MyCoupons />
      <MyRaces />
      <MyEvents />
      <MySeats />
    </div>
  );
}
