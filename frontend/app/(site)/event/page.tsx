import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import EventCard from "./_components/EventCard";
import styles from "./_components/event.module.css";
import { getEvents } from "./_lib/eventService";

export const metadata: Metadata = { title: "RACE EVENT" };

/**
 * 진행 중인 카페 이벤트 — /event. 설계: BLUEPRINT 8.5.
 * 내 쿠폰은 여기서 보여주지 않는다(마이페이지 /my).
 * 모두에게 같은 내용이라 "use cache" 로 정적 셸에 넣는다(/menu 와 같은 방식).
 */
export default async function EventPage() {
  "use cache";
  cacheLife("hours");

  const events = await getEvents();

  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">Race Events</span>
        <h1 className="title-xl">RACE EVENT</h1>
        <p className="subtitle">지금 진행 중인 manhattaN cafe 의 이벤트를 확인하세요.</p>
      </div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <strong>진행 중인 이벤트가 없어요</strong>
          <p>다음 이벤트에서 만나요.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
