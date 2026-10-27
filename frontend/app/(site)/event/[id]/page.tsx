import type { Metadata } from "next";
import { Suspense } from "react";
import EventDetail, { EventDetailSkeleton } from "../_components/EventDetail";
import { parseEventId } from "../_lib/eventStatus";

export const metadata: Metadata = { title: "RACE EVENT" };

/**
 * 이벤트 상세 — /event/[id]. 설계: BLUEPRINT 8.5.
 * 이벤트는 서버 값(GET /api/v1/events)이라 내용(노출 여부 · 진행 상태)은 클라이언트(EventDetail)가 불러와 그린다.
 * params 는 Suspense 안에서만 읽는다(/menu/[id] 와 같은 이유 — partialPrefetching 의 공용 App Shell).
 */
// cacheComponents 는 동적 경로에 미리 만들 params 가 하나 이상 있어야 공용 셸을 만든다. 내용은 클라이언트가 불러오므로
// 셸 하나(id 1)만 빌드 때 만들고, 다른 id 는 첫 요청 때 같은 셸로 만든다(빌드 때는 서버 API 를 부르지 않는다).
export async function generateStaticParams() {
  return [{ id: "1" }];
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
