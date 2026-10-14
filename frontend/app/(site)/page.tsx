import { cacheLife } from "next/cache";
import Hero from "./_components/Hero";
import MenuLineup from "./_components/MenuLineup";
import RunnerStatus from "./_components/RunnerStatus";
import SeatStatus from "./_components/SeatStatus";
import { HERO_SLIDES } from "./_data/heroSlides";
import { getHorses, getRaceHistory } from "./race/_lib/raceService";
import { getBranches } from "./seat/_lib/seatService";

// 메인 — 히어로(전폭 슬라이더) → 오늘의 라인업(메뉴 그리드) → 출전마 상태(가로 슬라이더) → 지점별 좌석 현황.
// 지점 · 출전마 · 지난 기록은 모두에게 같아 "use cache" 로 정적 셸에 넣고, 시각에 따라 바뀌는 값(좌석 점유 · 게이트 · 컨디션)은
// 각 섹션이 마운트 뒤 시계를 읽어 채운다. MenuLineup 은 자체 "use cache" 컴포넌트라 Suspense 없이 그대로 들어간다.
export default async function HomePage() {
  "use cache";
  cacheLife("hours");

  const [branches, horses, history] = await Promise.all([getBranches(), getHorses(), getRaceHistory()]);

  return (
    <>
      <Hero slides={HERO_SLIDES} />
      <MenuLineup />
      <RunnerStatus horses={horses} history={history} />
      <SeatStatus branches={branches} />
    </>
  );
}
