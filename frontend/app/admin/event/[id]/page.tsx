import type { Metadata } from "next";
import { Suspense } from "react";
import { parseEventId } from "@/app/(site)/event/_lib/eventStatus";
import EventAdminDetail from "../_components/EventAdminDetail";

export const metadata: Metadata = { title: "이벤트 상세" };

/**
 * /admin/event/[id] — 이벤트 상세(관리자). 설계: BLUEPRINT 8.12.
 * 이벤트는 관리자 API(서버) 값이라 클라이언트가 불러와 그린다.
 * params 는 Suspense 안에서만 읽는다(partialPrefetching 의 공용 App Shell).
 */
// 셸 하나(id 1)만 빌드 때 만든다 — 손님 상세(/event/[id])와 같은 이유
export async function generateStaticParams() {
  return [{ id: "1" }];
}
export default function AdminEventDetailPage({ params }: PageProps<"/admin/event/[id]">) {
  return (
    <Suspense fallback={<p aria-busy="true">이벤트를 불러오는 중…</p>}>
      <AdminEventDetailContent params={params} />
    </Suspense>
  );
}

async function AdminEventDetailContent({ params }: Pick<PageProps<"/admin/event/[id]">, "params">) {
  return <EventAdminDetail id={parseEventId((await params).id)} />;
}
