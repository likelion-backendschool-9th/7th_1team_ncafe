import Hero from "./_components/Hero";
import MenuLineup from "./_components/MenuLineup";
import { HERO_SLIDES } from "./_data/heroSlides";

// 메인 — 히어로(전폭 슬라이더) + 오늘의 라인업(메뉴 그리드).
// MenuLineup 은 "use cache" 컴포넌트라 Suspense 없이 정적 셸에 그대로 들어간다(첫 화면에 스켈레톤 없음).
// 대시보드 카드·카운트다운 등 나머지 영역은 6·14단계에서 이어 붙인다.
export default function HomePage() {
  return (
    <>
      <Hero slides={HERO_SLIDES} />
      <MenuLineup />
    </>
  );
}
