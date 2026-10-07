import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "RACE EVENT" };

// 임시 화면 — 5단계 — 쿠폰 지갑 & 이벤트 에서 실제 페이지로 교체한다.
export default function Page() {
  return <ComingSoon eyebrow="Events & Race Tickets" title="RACE EVENT" description="진행 중인 이벤트와 내 쿠폰을 확인하세요." step="5단계 — 쿠폰 지갑 & 이벤트" />;
}
