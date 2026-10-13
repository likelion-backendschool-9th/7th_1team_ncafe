import type { Metadata } from "next";
import { Suspense } from "react";
import EventDetail, { EventDetailSkeleton } from "../_components/EventDetail";
import { getEvent, getEvents } from "../_lib/eventService";
import { parseEventId } from "../_lib/eventStatus";

/**
 * 이벤트 상세 — /event/[id]. 설계: BLUEPRINT 8.5.
 * 기본 이벤트는 빌드 때 셸을 미리 만들고, 관리자가 새로 등록한 id 는 첫 요청 때 만든다.
 * 내용(노출 여부 · 진행 상태)은 오늘 날짜와 관리자 변경(같은 브라우저)에 달려 있어 클라이언트(EventDetail)가 그린다.
 * params 는 Suspense 안에서만 읽는다(/menu/[id] 와 같은 이유 — partialPrefetching 의 공용 App Shell).
 */
export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ id: String(e.id) }));
}

export async function generateMetadata({ params }: PageProps<"/event/[id]">): Promise<Metadata> {
  const id = parseEventId((await params).id);
  const event = id === null ? null : await getEvent(id);
  return event ? { title: event.title, description: event.description } : { title: "RACE EVENT" };
}

export default function EventDetailPage({ params }: PageProps<"/event/[id]">) {
  return (
    <div className="container page">
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function EventDetailContent({ params }: Pick<PageProps<"/event/[id]">, "params">) {
  return <EventDetail id={parseEventId((await params).id)} />;
}
