import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import EventList from "./_components/EventList";

export const metadata: Metadata = { title: "RACE EVENT" };

/**
 * 진행 중인 카페 이벤트 — /event. 설계: BLUEPRINT 8.5.
 * 내 쿠폰 · 내 이벤트 참여는 여기서 보여주지 않는다(마이페이지 /my).
 * 제목은 모두에게 같아 "use cache" 로 정적 셸에 넣고, 목록은 서버 값(GET /api/v1/events)과 오늘 날짜(진행 상태)를 따라
 * 클라이언트(EventList)가 불러와 그린다.
 */
export default async function EventPage() {
  "use cache";
  cacheLife("hours");

  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">Race Events</span>
        <h1 className="title-xl">RACE EVENT</h1>
        <p className="subtitle">지점마다 열리는 manhattaN cafe 의 이벤트를 확인하고 참여해 보세요.</p>
      </div>

      <EventList />
    </div>
  );
}
