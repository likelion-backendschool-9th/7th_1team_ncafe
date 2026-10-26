import type { Metadata } from "next";
import RaceAdmin from "./_components/RaceAdmin";

export const metadata: Metadata = { title: "경주 관리" };

/** /admin/race — 경주 관리(현황 · 시간표 · 출전마 · 기록). 설계: BLUEPRINT 8.11. 데이터는 관리자 API 에서 브라우저가 불러온다 */
export default function AdminRacePage() {
  return <RaceAdmin />;
}
