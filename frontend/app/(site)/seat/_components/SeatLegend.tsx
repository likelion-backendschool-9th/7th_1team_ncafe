import type { SeatSummaryData } from "../_lib/summary";
import { chairClassName, chairGlyph } from "./Chair";
import styles from "./seat.module.css";

/** 색 + 아이콘 + 텍스트 범례(지시서 15절) — 캔버스 아래 줄. 상태별 의자 수를 함께 보여 준다. */
export default function SeatLegend({ summary }: { summary: SeatSummaryData | null }) {
  const items = [
    { key: "AVAILABLE", label: "이용 가능", className: chairClassName("AVAILABLE"), glyph: <span className={styles.chairNo}>1</span>, count: summary?.byStatus.AVAILABLE },
    { key: "SELECTED", label: "선택", className: chairClassName("AVAILABLE", { selected: true }), glyph: chairGlyph("AVAILABLE", { selected: true }) },
    { key: "MINE", label: "내 예약", className: chairClassName("RESERVED", { mine: true }), glyph: chairGlyph("RESERVED", { mine: true }) },
    { key: "USING", label: "사용 중", className: chairClassName("USING"), glyph: chairGlyph("USING"), count: summary?.byStatus.USING },
    { key: "RESERVED", label: "예약", className: chairClassName("RESERVED"), glyph: chairGlyph("RESERVED"), count: summary?.byStatus.RESERVED },
    { key: "REPAIR", label: "수리 중", className: chairClassName("REPAIR"), glyph: chairGlyph("REPAIR"), count: summary?.byStatus.REPAIR },
  ] as const;

  return (
    <ul className={styles.legend} aria-label="좌석 상태 범례">
      {items.map((item) => (
        <li key={item.key} className={styles.legendItem}>
          <span className={`${item.className} ${styles.legendSwatch}`} aria-hidden>
            {item.glyph}
          </span>
          {item.label}
          {"count" in item && item.count !== undefined && <strong>({item.count})</strong>}
        </li>
      ))}
    </ul>
  );
}
