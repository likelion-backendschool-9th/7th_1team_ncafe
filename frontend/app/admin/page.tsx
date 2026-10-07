import { redirect } from "next/navigation";

// /admin → 메뉴 관리로 이동
export default function AdminIndex() {
  redirect("/admin/menus");
}
