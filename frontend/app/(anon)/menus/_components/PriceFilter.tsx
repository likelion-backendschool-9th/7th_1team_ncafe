// 메뉴 목록 좌측 가격 필터 — m3-card + m3-list.
import Link from "next/link";

export type PriceOption = { value: string; label: string };

const PRICES = [
  { value: "0-5000", label: "~5,000원" },
  { value: "5000-7000", label: "5,000~7,000원" },
  { value: "7000-", label: "7,000원~" },
];

export default function PriceFilter({ currentPrice }: { currentPrice?: string | null; }) {
  return (
    <section className="m3-card card:outlined card-padding:self">
      <div className="card-header">
        <div className="card-titles">
          <h2 className="card-subhead">가격</h2>
        </div>
      </div>
      <ul className="m3-list list-size:compact">
        {PRICES.map((p) => {
          const active = currentPrice === p.value;
          return (
            <li key={p.value}>
              <Link
                href={`/menus?price=${p.value}`}
                className={`list-item${active ? " list-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="list-content">{p.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
