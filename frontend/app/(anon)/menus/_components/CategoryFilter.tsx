// 메뉴 목록 좌측 카테고리 필터 — m3-card + m3-list. "전체" 는 API 에 없고 프론트가 카테고리 합계로 만든다.
import Link from "next/link";
import type { Category } from "@/lib/types";

export default async function CategoryFilter({ currentCategoryId }: { currentCategoryId?: number | null }) {
  const res = await fetch("http://localhost:8080/api/v1/menus/categories", {
    cache: "no-store", // 실시간 데이터 반영을 위해 캐시 비활성화 (필요시 next: { revalidate: 3600 } 등으로 변경 가능)
  });
  const categories: Category[] = res.ok ? await res.json() : [];

  const total = categories.reduce((n, c) => n + c.count, 0);
  const items = [{ id: null as number | null, name: "전체", count: total }, ...categories];

  return (
    <section className="m3-card card:outlined card-padding:self">
      <div className="card-header">
        <div className="card-titles">
          <h2 className="card-subhead">카테고리</h2>
        </div>
      </div>
      <ul className="m3-list list-size:compact">
        {items.map((c) => {
          const active = (currentCategoryId ?? null) === c.id;
          return (
            <li key={c.name}>
              <Link
                href={c.id === null ? "/menus" : `/menus?category=${c.id}`}
                className={`list-item${active ? " list-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="list-content">{c.name}</span>
                <span className="list-trailing">{c.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
