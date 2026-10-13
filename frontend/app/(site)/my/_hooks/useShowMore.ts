"use client";

import { useState } from "react";

/** 섹션 목록을 처음엔 limit 개만 보여 주고 "전체 보기"로 펼친다. */
export function useShowMore<T>(items: T[], limit: number) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > limit;

  return {
    visible: expanded || !hasMore ? items : items.slice(0, limit),
    expanded,
    hasMore,
    total: items.length,
    toggle: () => setExpanded((v) => !v),
  };
}
