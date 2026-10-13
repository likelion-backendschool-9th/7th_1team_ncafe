import type { Metadata } from "next";
import RaceLab from "./RaceLab";

export const metadata: Metadata = { title: "RACE LAB", robots: { index: false, follow: false } };

/** /race/lab — 경주 시뮬레이션 · 경기 화면 확인용 테스트 페이지. 쿠폰 · 단계(RaceProvider)와 무관하게 혼자 돌아간다. */
export default function RaceLabPage() {
  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">Developer Tool</span>
        <h1 className="title-xl">RACE LAB</h1>
        <p className="subtitle">시뮬레이션(simulation.ts)과 경기 화면(trackScene.ts)을 쿠폰 없이 바로 돌려 보는 테스트 페이지예요.</p>
      </div>
      <RaceLab />
    </div>
  );
}
