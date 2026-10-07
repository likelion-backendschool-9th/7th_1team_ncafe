import type { Metadata } from "next";
import { getCategories, getMenuImageOptions, getMenus } from "@/app/(site)/menu/_lib/menuService";
import MenuAdminTable from "./_components/MenuAdminTable";

export const metadata: Metadata = { title: "메뉴 관리" };

export default async function AdminMenusPage() {
  const [menus, categories, images] = await Promise.all([getMenus(), getCategories(), getMenuImageOptions()]);
  return <MenuAdminTable initialMenus={menus} categories={categories} imageOptions={images} />;
}
