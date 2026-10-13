import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import RaceBoard from "./_components/RaceBoard";
import RaceCountdown from "./_components/RaceCountdown";
import { getHorses, getRaceHistory } from "./_lib/raceService";

export const metadata: Metadata = { title: "DAILY CAFE RACE" };

/**
 * DAILY CAFE RACE — /race. 설계: BLUEPRINT 8.2.
 * 위에서부터 제목 → 전광판(다음 경기 · 남은 시간 · 내 쿠폰) → 출전표(쿠폰 걸기) · 출발 대기.
 * 출전마와 지난 기록은 모두에게 같아 "use cache" 로 정적 셸에 넣고,
 * 내 선택 · 단계는 RaceProvider(루트), 쿠폰은 UserProvider 에서 읽는다.
 * 트랙 · 시뮬레이션(8단계), 결과 · 기록(9단계)은 출전표 아래에 이어 붙인다.
 */
export default async function RacePage() {
  "use cache";
  cacheLife("hours");

  const [horses, history] = await Promise.all([getHorses(), getRaceHistory()]);

  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">manhattaN cafe Presents</span>
        <h1 className="title-xl">DAILY CAFE RACE</h1>
        <p className="subtitle">쿠폰 한 장으로 7마리 말 중 한 마리를 응원하세요. 3위 안에 들면 추가 쿠폰을 돌려받아요.</p>
      </div>
      <RaceCountdown />
      <RaceBoard horses={horses} history={history} />
    </div>
  );
}
