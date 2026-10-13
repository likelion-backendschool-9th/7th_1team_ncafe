import type { Metadata } from "next";
import { getHorses, getRaceHistory } from "@/app/(site)/race/_lib/raceService";
import RaceAdmin from "./_components/RaceAdmin";

export const metadata: Metadata = { title: "경주 관리" };

/** /admin/race — 경주 관리(현황 · 시간표 · 출전마 · 기록). 설계: BLUEPRINT 8.11 */
export default async function AdminRacePage() {
  const [horses, history] = await Promise.all([getHorses(), getRaceHistory()]);
  return <RaceAdmin horses={horses} history={history} />;
}
