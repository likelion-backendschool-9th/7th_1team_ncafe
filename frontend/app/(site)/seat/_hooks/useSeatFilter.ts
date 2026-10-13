"use client";

import { useCallback, useState } from "react";
import { EMPTY_FILTER, isFilterActive, type SeatFilterState } from "../_lib/filter";
import type { SeatFeature } from "../_types";

/** 좌석 필터 State — [전체]/[이용 가능만] · 특징 체크 · 초기화. 페이지 로컬이라 다른 페이지를 다녀와도 남는다(Activity). */
export function useSeatFilter() {
  const [filter, setFilter] = useState<SeatFilterState>(EMPTY_FILTER);

  const setOnlyAvailable = useCallback((onlyAvailable: boolean) => setFilter((f) => ({ ...f, onlyAvailable })), []);

  const toggleFeature = useCallback(
    (feature: SeatFeature) =>
      setFilter((f) => ({
        ...f,
        features: f.features.includes(feature) ? f.features.filter((x) => x !== feature) : [...f.features, feature],
      })),
    [],
  );

  const reset = useCallback(() => setFilter(EMPTY_FILTER), []);

  return { filter, active: isFilterActive(filter), setOnlyAvailable, toggleFeature, reset };
}

export type SeatFilterControls = ReturnType<typeof useSeatFilter>;
