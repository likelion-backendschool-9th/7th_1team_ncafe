import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getCategories, getMenus } from "../menu/_lib/menuService";
import FavoriteMenus from "./_components/FavoriteMenus";
import MyCoupons from "./_components/MyCoupons";
import MyOverview from "./_components/MyOverview";
import MyRaces from "./_components/MyRaces";
import MySeats from "./_components/MySeats";
import OrderHistory from "./_components/OrderHistory";
import { getProfile } from "./_lib/myService";

export const metadata: Metadata = { title: "MY PAGE" };

/**
 * 마이페이지 — /my. 설계: BLUEPRINT 8.10.
 * 내 정보 + 요약 → 주문 내역 → 찜한 메뉴 → 쿠폰 → 내 레이스 기록 → 좌석 예약 내역 을 세로로 놓는다.
 * 프로필 · 메뉴 목록은 모두에게 같아 "use cache" 로 정적 셸에 넣고(Mock 사용자 1명 기준),
 * 쿠폰 · 찜 · 주문 · 좌석 예약은 UserProvider(React State)에서 읽는다 — 정적 셸에는 초기값(쿠폰 5장 · 나머지 비어 있음)이 들어간다.
 * 내 레이스 기록은 로그인 회원의 서버 기록이라 MyRaces 가 마운트 뒤 불러온다.
 */
export default async function MyPage() {
  "use cache";
  cacheLife("hours");

  const [profile, categories, menus] = await Promise.all([getProfile(), getCategories(), getMenus()]);
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

      <MyOverview profile={profile} />
      <OrderHistory />
      <FavoriteMenus menus={pickable} />
      <MyCoupons />
      <MyRaces />
      <MySeats />
    </div>
  );
}
