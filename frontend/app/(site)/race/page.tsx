import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "DAILY CAFE RACE" };

// 임시 화면 — 6~9단계 — 경주 일정 · 출전표 · 시뮬레이션 · 결과 에서 실제 페이지로 교체한다.
export default function Page() {
  return <ComingSoon eyebrow="NCafe Racecourse Presents" title="DAILY CAFE RACE" description="매일 열리는 카페 미니 경마 · 쿠폰으로 참여하는 가벼운 이벤트" step="6~9단계 — 경주 일정 · 출전표 · 시뮬레이션 · 결과" />;
}
