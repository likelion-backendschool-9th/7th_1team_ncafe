import { cacheLife } from "next/cache";
import Hero from "./_components/Hero";
import MenuLineup from "./_components/MenuLineup";
import RunnerStatus from "./_components/RunnerStatus";
import SeatStatus from "./_components/SeatStatus";
import { HERO_SLIDES } from "./_data/heroSlides";
import { getBranches } from "./seat/_lib/seatService";

// 메인 — 히어로(전폭 슬라이더) → 오늘의 라인업(메뉴 그리드) → 출전마 상태(가로 슬라이더) → 지점별 좌석 현황.
// 지점은 모두에게 같아 "use cache" 로 정적 셸에 넣고, 시각에 따라 바뀌는 값(좌석 점유)은 섹션이 마운트 뒤 시계를 읽어 채운다.
// 출전마 · 경주 · 기록은 수시로 바뀌는 서버 값이라 RunnerStatus 가 마운트 뒤 불러온다(race/_lib/raceStores).
// MenuLineup 은 자체 "use cache" 컴포넌트라 Suspense 없이 그대로 들어간다.
export default async function HomePage() {
  "use cache";
  cacheLife("hours");

  const branches = await getBranches();

  return (
    <>
      <Hero slides={HERO_SLIDES} />
      <MenuLineup />
      <RunnerStatus />
      <SeatStatus branches={branches} />
    </>
  );
}
