import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getCategories, getMenus } from "../menu/_lib/menuService";
import FavoriteMenus from "./_components/FavoriteMenus";
import MyCoupons from "./_components/MyCoupons";
import MyOverview from "./_components/MyOverview";
import OrderHistory from "./_components/OrderHistory";
import PlannedSection from "./_components/PlannedSection";
import { getProfile } from "./_lib/myService";

export const metadata: Metadata = { title: "MY PAGE" };

/**
 * 마이페이지 — /my. 설계: BLUEPRINT 8.10.
 * 내 정보 + 요약 → 주문 내역 → 찜한 메뉴 → 쿠폰 → 내 레이스 기록 · 좌석 예약 내역(준비 중) 을 세로로 놓는다.
 * 로그인이 없으므로 Mock 사용자 1명 기준이다. 프로필과 메뉴 목록은 모두에게 같아 "use cache" 로 정적 셸에 넣고,
 * 쿠폰 · 찜 · 주문은 UserProvider(React State)에서 읽는다 — 정적 셸에는 초기값(쿠폰 5장 · 나머지 비어 있음)이 들어간다.
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
      <PlannedSection
        id="races"
        label="MY RACES"
        title="내 레이스 기록"
        description="레이스에 참여하면 내가 고른 말과 순위, 돌려받은 쿠폰이 여기에 기록돼요."
        href="/race"
        linkLabel="출전표 보기"
      />
      <PlannedSection
        id="seats"
        label="MY SEATS"
        title="좌석 예약 내역"
        description="좌석을 예약하면 예약한 자리와 시간이 여기에 보여요."
        href="/seat"
        linkLabel="좌석 보기"
      />
    </div>
  );
}
