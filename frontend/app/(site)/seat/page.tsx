import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import SeatBooking from "./_components/SeatBooking";
import { getBranchLayouts, getTimeBlocks } from "./_lib/seatService";

export const metadata: Metadata = { title: "SEAT MAP" };

/**
 * 좌석 예약 — /seat. 설계: BLUEPRINT 8.3.
 * 제목 → 일정 바(고른 일정 · 좌석 현황) → [배치도 캔버스 | 패널(일정 선택 → 선택 좌석 → 완료)].
 * 지점 · 지점별 배치도(평면도 + 좌석) · 시간대는 모두에게 같아 "use cache" 로 정적 셸에 넣고(서버에서 백엔드를 부른다),
 * 날짜 · 시간대별 좌석 상태와 내 예약은 클라이언트(useSeatBooking · UserProvider)가 다룬다.
 * 관리자가 평면도 · 좌석 배치를 바꾸면 캐시가 끝나는 몇 분 안에 반영된다(자주 바뀌지 않아 태그 무효화는 두지 않는다).
 */
export default async function SeatPage() {
  "use cache";
  cacheLife("minutes");

  const [{ branches, layouts }, timeBlocks] = await Promise.all([getBranchLayouts(), getTimeBlocks()]);

  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">Seat Reservation · 좌석 예약</span>
        <h1 className="title-xl">SEAT MAP</h1>
        <p className="subtitle">날짜와 시간대를 고르고, 배치도에서 앉을 자리를 직접 골라 예약하세요.</p>
      </div>
      <SeatBooking layouts={layouts} branches={branches} timeBlocks={timeBlocks} />
    </div>
  );
}
