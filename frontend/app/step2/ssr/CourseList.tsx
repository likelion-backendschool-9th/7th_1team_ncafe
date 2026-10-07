import Link from "next/link";

interface CourseListProps {
    category: string;
    page: number;
}

export default function CourseList({ category, page }: CourseListProps) {
    // courses 배열은 자식 내부에서 정의합니다.
    const courses = [
        { id: 1, title: "React 기초", category: "frontend" },
        { id: 2, title: "Next.js 실습", category: "frontend" },
        { id: 3, title: "Node.js 서버", category: "backend" },
        { id: 4, title: "UI 디자인 원칙", category: "design" },
        { id: 5, title: "TypeScript 입문", category: "frontend" }
    ];

    // 필터링과 슬라이싱 로직은 자식 내부에서 처리합니다.
    const filteredItems = courses.filter((item) => (category === "all" ? true : item.category === category));
    const itemsPerPage = 3;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const currentPageItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <>
        <h1 className="font-size:heading-md font-weight:bold margin-bottom:4">
            {category === "all" ? "전체" : category} 항목
        </h1>

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

        <div className="display:flex justify-content:center align-items:center gap:2">
            {page > 1 ? (
                <Link href={`/step2/ssr?category=${category}&page=${page - 1}`} className="m3-btn btn:outlined btn-size:sm">
                    이전
                </Link>
            ): (
                <button className="m3-btn btn:outlined btn-size:sm" disabled>이전</button>
            )}
            
            <span className="font-size:body-sm font-weight:medium padding-x:2">
                {page} / {totalPages || 1}
            </span>

            {page < totalPages ? (
                <Link href={`/step2/ssr?category=${category}&page=${page + 1}`} className="m3-btn btn:outlined btn-size:sm">
                    다음
                </Link>
            ) : (
                <button className="m3-btn btn:outlined btn-size:sm" disabled>다음</button>
            )}
        </div>
        </>
    );
}