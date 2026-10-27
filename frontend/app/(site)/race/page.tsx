import type { Metadata } from "next";
import RaceBoard from "./_components/RaceBoard";
import RaceCountdown from "./_components/RaceCountdown";

export const metadata: Metadata = { title: "DAILY CAFE RACE" };

/**
 * DAILY CAFE RACE — /race. 설계: BLUEPRINT 8.2.
 * 위에서부터 제목 → 전광판(다음 경기 · 남은 시간 · 내 쿠폰) → 출전표(쿠폰 걸기) · 출발 대기.
 * 경주 · 출전마 · 기록은 수시로 바뀌는 서버 값이라 정적 셸에 넣지 않고 브라우저에서 불러온다(lib/raceSchedule · _lib/raceStores).
 * 진행 상태는 RaceProvider(루트), 로그인 회원 · 쿠폰 수는 lib/auth 에서 읽는다.
 */
export default function RacePage() {
  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">manhattaN cafe Presents</span>
        <h1 className="title-xl">DAILY CAFE RACE</h1>
        <p className="subtitle">쿠폰 한 장으로 7마리 말 중 한 마리를 응원하세요. 3위 안에 들면 추가 쿠폰을 돌려받아요.</p>
      </div>
      <RaceCountdown />
      <RaceBoard />
    </div>
  );
}
