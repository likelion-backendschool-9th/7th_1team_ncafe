import Link from "next/link";

export default async function SSRPage({
    searchParams
}: {
    searchParams: Promise<{ category?: string, page?: string }>
}) {
    // searchParams는 Promise이므로 await로 값을 꺼냅니다.
    const params = await searchParams;

    // 기본값 설정: 카테고리는 'all', 페이지는 '1'
    const category = params.category || "all";
    const page = parseInt(params.page || "1", 10);

    // 카테고리 목록 (실제 앱에서는 DB에서 올 수 있음)
    const categories = ["all", "frontend", "backend", "design"];

    // 현재 카테고리에 따른 항목 목록 (모의 데이터)
    const items = [
        { id: 1, title: "React 기초", category: "frontend" },
        { id: 2, title: "Next.js 실습", category: "frontend" },
        { id: 3, title: "Node.js 서버", category: "backend" },
        { id: 4, title: "UI 디자인 원칙", category: "design" },
        { id: 5, title: "TypeScript 입문", category: "frontend" }
    ];

    // 현재 카테고리로 필터링
    const filteredItems = items.filter((item) => (category === "all" ? true : item.category === category));

    // 페이지네이션 로직 (간단화: 페이지당 3개)
    const itemsPerPage = 3;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const currentPageItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="site-body site-body:aside padding:4">
            {/* 좌측: 카테고리 목록 */}
            <aside className="site-aside">
                <section className="m3-card card:outlined card-padding:self">
                    <div className="card-header">
                        <div className="card-titles">
                            <h2 className="card-subhead">카테고리</h2>
                        </div>
                    </div>
                    <ul className="m3-list list-size:compact">
                        {categories.map((cat) => {
                            const isActive = category === cat;
                            return (
                                <li key={cat}>
                                    <Link
                                        href={`/step1/ssr?category=${cat}&page=1`}
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
            </aside>

            {/* 우측: 항목 목록 + 페이지네이션 */}
            <main className="site-content">
                <h1 className="font-size:heading-md font-weight:bold margin-bottom:4">
                    {category === "all" ? "전체" : category} 항목
                </h1>

                {/* 항목 목록 */}
                <ul className="display:flex flex-direction:column gap:2 margin-bottom:6">
                    {currentPageItems.map((item) => (
                        <li key={item.id} className="m3-card card:outlined card-padding:self padding:3">
                            <div className="display:flex justify-content:space-between align-items:center">
                                <span className="font-weight:medium">{item.title}</span>
                                <span className="m3-badge badge:inline badge-color:neutral font-size:body-xs">{item.category}</span>
                            </div>
                        </li>
                    ))}
                    {currentPageItems.length === 0 && (
                        <li className="text-align:center padding-y:8 color:text-muted">항목이 없습니다.</li>
                    )}
                </ul>

                {/* 페이지네이션 */}
                <div className="display:flex justify-content:center align-items:center gap:2">
                    {page > 1 ? (
                        <Link
                            href={`/step1/ssr?category=${category}&page=${page - 1}`}
                            className="m3-btn btn:outlined btn-size:sm"
                        >
                            이전
                        </Link>
                    ) : (
                        <button className="m3-btn btn:outlined btn-size:sm" disabled>
                            이전
                        </button>
                    )}

                    <span className="font-size:body-sm font-weight:medium padding-x:2">
                        {page} / {totalPages || 1}
                    </span>

                    {page < totalPages ? (
                         <Link
                            href={`/step1/ssr?category=${category}&page=${page + 1}`}
                            className="m3-btn btn:outlined btn-size:sm"
                        >
                            다음
                        </Link>
                    ) : (
                        <button className="m3-btn btn:outlined btn-size:sm" disabled>
                            다음
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}