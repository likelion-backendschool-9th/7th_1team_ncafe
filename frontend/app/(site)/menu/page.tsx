import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "MENU BOARD" };

// 임시 화면 — 4단계 — 메뉴 조회 에서 실제 페이지로 교체한다.
export default function Page() {
  return <ComingSoon eyebrow="Today's Line-up" title="MENU BOARD" description="오늘의 라인업 — 경마 티켓 스타일 메뉴판" step="4단계 — 메뉴 조회" />;
}
