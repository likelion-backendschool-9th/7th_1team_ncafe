import type { Metadata } from "next";
import CategoryAdminScreen from "./_components/CategoryAdminScreen";

export const metadata: Metadata = { title: "카테고리 관리" };

// 카테고리 · 메뉴는 로그인한 관리자로 브라우저에서 받는다(CategoryAdminScreen).
export default function AdminCategoriesPage() {
  return <CategoryAdminScreen />;
}
