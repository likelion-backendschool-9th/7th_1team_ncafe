import type { Metadata } from "next";
import { getCategories, getMenus } from "@/app/(site)/menu/_lib/menuService";
import CategoryList from "./_components/CategoryList";

export const metadata: Metadata = { title: "카테고리 관리" };

export default async function AdminCategoriesPage() {
  const [categories, menus] = await Promise.all([getCategories(), getMenus()]);
  return <CategoryList initialCategories={categories} menus={menus} />;
}
