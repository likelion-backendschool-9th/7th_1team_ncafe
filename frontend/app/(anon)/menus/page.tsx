// 메뉴 목록 — 왼쪽 필터(카테고리·가격) + 오른쪽 목록(정렬·카드·페이지). 데이터는 lib/mock (모양 = 백엔드 DTO).
import CategoryFilter from "./_components/CategoryFilter";
import MenuList from "./_components/MenuList";
import PriceFilter from "./_components/PriceFilter";
import { MENUS } from "@/lib/mock";

interface MenusPageProps {
  searchParams: Promise<{
    category?: string;
    price?: string;
  }>;
}

export default async function MenusPage({ searchParams }: MenusPageProps) {
  const { category, price } = await searchParams;
  const currentCategoryId = category ? parseInt(category, 10) : null;
  const currentPrice = price || null;

  return (
    <>
      <div className="margin-bottom:8">
        <h1 className="font-size:heading-md font-weight:bold">메뉴</h1>
        <p className="margin-top:2 font-size:body-sm color:text-muted">취향에 맞는 음료와 디저트를 찾아보세요.</p>
      </div>

      <div className="site-body site-body:aside">
        {/* ----- 좌측 필터: m3-card + m3-list / m3-checkbox (가구·물품) ----- */}
        <aside className="site-aside">
          <CategoryFilter currentCategoryId={currentCategoryId} />
          <PriceFilter currentPrice={currentPrice} />
        </aside>

        {/* ----- 우측 목록: 툴바 + m3-grid(m3-card) + m3-pager ----- */}
        <section className="site-content">
          <MenuList menus={MENUS} />
        </section>
      </div>
    </>
  );
}
