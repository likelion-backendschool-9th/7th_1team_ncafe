import type { Metadata } from "next";
import { getMenuImageOptions } from "@/app/(site)/menu/_lib/menuService";
import MenuAdminScreen from "./_components/MenuAdminScreen";

export const metadata: Metadata = { title: "메뉴 관리" };

// 메뉴 · 카테고리 · 지점은 로그인한 관리자로 브라우저에서 받는다(MenuAdminScreen). 이미지 선택지는 프론트의 일러스트 목록이다.
export default async function AdminMenusPage() {
  const images = await getMenuImageOptions();
  return <MenuAdminScreen imageOptions={images} />;
}
