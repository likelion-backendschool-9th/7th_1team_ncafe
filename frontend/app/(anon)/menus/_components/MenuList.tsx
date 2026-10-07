// 메뉴 목록 우측 — 정렬 툴바 + m3-grid(m3-card) + m3-pager.
import MenuCard from "../../_components/MenuCard";
import Pager from "@/app/_components/Pager";
import type { MenuSummary, Page } from "@/lib/types";

export default function MenuList({ menus }: { menus: Page<MenuSummary> }) {
  return (
    <>
      <div className="m3-toolbar">
        <p className="toolbar-start">
          총 <strong>{menus.total}</strong>개의 메뉴
        </p>
        <div className="toolbar-end width:ex" style={{ "--width-ex": "9rem" }}>
          <div className="m3-text-field field:outlined field-label:none">
            <select name="sort" defaultValue="popular" aria-label="정렬">
              <option value="popular">인기순</option>
              <option value="latest">최신순</option>
              <option value="priceAsc">낮은 가격순</option>
              <option value="priceDesc">높은 가격순</option>
            </select>
          </div>
        </div>
      </div>

      <ul className="m3-grid grid-cols:3">
        {menus.items.map((m) => (
          <MenuCard
            key={m.slug}
            menu={m}
            heading="h2"
            badge={
              m.status === "soldout" ? (
                <span className="m3-badge badge:inline badge-color:neutral">품절</span>
              ) : m.isNew ? (
                <span className="m3-badge badge:inline badge-color:primary">NEW</span>
              ) : undefined
            }
            actions={
              <>
                <button type="button" className="m3-icon-btn icon-btn:outlined icon-btn-size:sm" aria-label="좋아요">
                  <i className="m3-icon icon:favorite" aria-hidden="true"></i>
                </button>
                {m.status !== "on" ? (
                  <button type="button" className="m3-btn btn-size:xs" disabled>
                    품절
                  </button>
                ) : (
                  <button type="button" className="m3-btn btn-size:xs">
                    담기
                  </button>
                )}
              </>
            }
          />
        ))}
      </ul>

      <Pager page={menus.page} totalPages={menus.totalPages} href="/menus" params={{}} className="margin-top:9" />
    </>
  );
}
