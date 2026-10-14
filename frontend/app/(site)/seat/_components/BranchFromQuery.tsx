"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Branch } from "../_types";

/**
 * `/seat?branch=gangnam` — 메인 "지점별 좌석 현황" 카드에서 들어오면 그 지점을 골라 둔다. 화면은 그리지 않는다.
 * useSearchParams 는 정적 셸에서 Suspense 경계까지를 클라이언트 렌더로 미루므로, SeatBooking 이 fallback 없는
 * 작은 Suspense 로 이 컴포넌트만 감싼다(예약 화면은 정적 셸에 그대로 남는다).
 * 같은 값은 한 번만 반영한다 — 그 뒤 칩으로 지점을 바꿔도 되돌리지 않는다.
 */
export default function BranchFromQuery({ branches, onPick }: { branches: Branch[]; onPick: (id: string) => void }) {
  const requested = useSearchParams().get("branch");
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (!requested || requested === applied.current) return;
    applied.current = requested;
    if (branches.some((b) => b.id === requested)) onPick(requested);
  }, [requested, branches, onPick]);

  return null;
}
