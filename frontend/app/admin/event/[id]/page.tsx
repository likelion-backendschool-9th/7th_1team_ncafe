import type { Metadata } from "next";
import { Suspense } from "react";
import { getEvents } from "@/app/(site)/event/_lib/eventService";
import { parseEventId } from "@/app/(site)/event/_lib/eventStatus";
import EventAdminDetail from "../_components/EventAdminDetail";

export const metadata: Metadata = { title: "이벤트 상세" };

/**
 * /admin/event/[id] — 이벤트 상세(관리자). 설계: BLUEPRINT 8.12.
 * 기본 이벤트는 빌드 때 셸을 만들고, 새로 등록한 id 는 첫 요청 때 만든다. 내용은 이벤트 저장소(같은 브라우저)를 따라 클라이언트가 그린다.
 * params 는 Suspense 안에서만 읽는다(partialPrefetching 의 공용 App Shell).
 */
export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ id: String(e.id) }));
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
