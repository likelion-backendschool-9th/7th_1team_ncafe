import type { Metadata } from "next";
import EventAdminList from "./_components/EventAdminList";

export const metadata: Metadata = { title: "이벤트 관리" };

/** /admin/event — 이벤트 관리(등록 · 수정 · 삭제 · 상태 · 노출). 설계: BLUEPRINT 8.12. 목록은 관리자 API(서버) 값을 구독한다(useAdminEvents) */
export default function AdminEventPage() {
  return <EventAdminList />;
}
