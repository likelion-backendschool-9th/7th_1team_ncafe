import { redirect } from "next/navigation";

// /admin → 본사·지점 공통 진입점인 회원관리로 이동
export default function AdminIndex() {
  redirect("/admin/branches/members");
}
