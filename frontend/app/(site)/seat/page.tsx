import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import SeatBooking from "./_components/SeatBooking";
import { getBranches, getFloorPlan, getSeats, getTimeBlocks } from "./_lib/seatService";

export const metadata: Metadata = { title: "SEAT MAP" };

/**
 * 좌석 예약 — /seat. 설계: BLUEPRINT 8.3.
 * 제목 → 일정 바(고른 일정 · 좌석 현황) → [배치도 캔버스 | 패널(일정 선택 → 선택 좌석 → 완료)].
 * 좌석 · 평면도 · 지점 · 시간대는 모두에게 같아 "use cache" 로 정적 셸에 넣고,
 * 날짜 · 시간대별 좌석 상태와 내 예약은 클라이언트(useSeatBooking · UserProvider)가 다룬다.
 */
export default async function SeatPage() {
  "use cache";
  cacheLife("hours");

  const [seats, floorPlan, branches, timeBlocks] = await Promise.all([getSeats(), getFloorPlan(), getBranches(), getTimeBlocks()]);

  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">Seat Reservation · 좌석 예약</span>
        <h1 className="title-xl">SEAT MAP</h1>
        <p className="subtitle">날짜와 시간대를 고르고, 배치도에서 앉을 자리를 직접 골라 예약하세요.</p>
      </div>
      <SeatBooking seats={seats} floorPlan={floorPlan} branches={branches} timeBlocks={timeBlocks} />
    </div>
  );
}
