import Link from "next/link";

interface CategoryListProps {
    activeCategory: string;
}

export default function CategoryList({ activeCategory }: CategoryListProps) {
    // categories 배열은 자식 내부에서 정의합니다.
    // 부모로부터 props로 받지 않습니다.
    const categories = ["all", "frontend", "backend", "design"];

    return (
        <section className="m3-card card:outlined card-padding:self">
            <div className="card-header">
                <div className="card-titles">
                    <h2 className="card-subhead">카테고리</h2>
                </div>
            </div>
            <ul className="m3-list list-size:compact">
                {categories.map((cat)=>{
                    const isActive = activeCategory === cat;
                    return (
                        <li key={cat}>
                            <Link
                                href={`/step2/ssr?category=${cat}&page=1`}
                                className={`list-item${isActive ? " list-active" : ""}`}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <span className="list-content">{cat === "all" ? "전체" : cat}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}