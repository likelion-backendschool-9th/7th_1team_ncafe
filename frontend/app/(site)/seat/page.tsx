import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "SEAT MAP" };

// 임시 화면 — 10~13단계 — 좌석 현황 · 예약 · 필터 · 추천 에서 실제 페이지로 교체한다.
export default function Page() {
  return <ComingSoon eyebrow="Seat Guide · 좌석 안내도" title="SEAT MAP" description="어디가 비어 있는지 한눈에 보고, 나에게 맞는 자리를 골라 보세요." step="10~13단계 — 좌석 현황 · 예약 · 필터 · 추천" />;
}
