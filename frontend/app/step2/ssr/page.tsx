import Link from "next/link";
import CategoryList from "./CategoryList";
import CourseList from "./CourseList";

export default async function SSRPage({
    searchParams
}: {
    searchParams: Promise<{ category?: string; page?: string }>;
}) {
    const params = await searchParams;
    const category = params.category || "all";
    const page = parseInt(params.page || "1", 10);

    return (
        <div className="site-body site-body:aside padding:4">
            <aside className="site-aside">
                {/* CategoryList 컴포넌트로 교체 */}
                <CategoryList activeCategory={category} />
            </aside>

            <main className="side-content">
                <CourseList category={category} page={page} />
            </main>
        </div>
    );
}