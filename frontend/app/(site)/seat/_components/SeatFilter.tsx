"use client";

import type { SeatFilterControls } from "../_hooks/useSeatFilter";
import { FILTER_FEATURES } from "../_lib/filter";
import { FEATURE_LABEL } from "../_lib/labels";
import { ResetIcon } from "./icons";
import styles from "./seat.module.css";

interface SeatFilterProps {
  controls: SeatFilterControls;
  people: number | null; // 일정에서 고른 인원 — 필터는 표시만 한다
}

/**
 * 좌석 필터(지시서 19절) — 배치도 카드 위쪽 줄. [전체] [이용 가능만] | 콘센트 · 창가 · 조용한 자리 · 단체석 | N명 기준 | 초기화.
 * 조건에 맞지 않는 자리는 배치도에서 반투명이 되고(숨기지 않음), 추천 목록도 같은 조건을 따른다.
 */
export default function SeatFilter({ controls, people }: SeatFilterProps) {
  const { filter, active, setOnlyAvailable, toggleFeature, reset } = controls;

  return (
    <div className={styles.filterRow} role="group" aria-label="좌석 필터">
      <span className={styles.toolLabel}>FILTER</span>
      <button type="button" className={styles.filterChip} aria-pressed={!filter.onlyAvailable} onClick={() => setOnlyAvailable(false)}>
        전체
      </button>
      <button type="button" className={styles.filterChip} aria-pressed={filter.onlyAvailable} onClick={() => setOnlyAvailable(true)}>
        이용 가능만
      </button>
      <span className={styles.filterSep} aria-hidden />
      {FILTER_FEATURES.map((feature) => (
        <button key={feature} type="button" className={styles.filterChip} aria-pressed={filter.features.includes(feature)} onClick={() => toggleFeature(feature)}>
          {FEATURE_LABEL[feature]}
        </button>
      ))}
      <span className={styles.filterPeople}>{people ? `${people}명 기준` : "인원 미선택"}</span>
      {active && (
        <button type="button" className={styles.filterReset} onClick={reset}>
          <ResetIcon /> 초기화
        </button>
      )}
    </div>
  );
}
