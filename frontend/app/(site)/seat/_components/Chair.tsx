"use client";

import { memo } from "react";
import { CHAIR } from "../_lib/geometry";
import { chairDescription, chairLabel, chairShort, STATUS_LABEL } from "../_lib/labels";
import type { Chair as ChairModel, SeatStatus } from "../_types";
import { CheckIcon, LockIcon, PersonIcon, WrenchIcon } from "./icons";
import styles from "./seat.module.css";

interface ChairProps {
  chair: ChairModel;
  status: SeatStatus;
  /** 같은 시간대에 내가 예약한 자리 */
  mine: boolean;
  selected: boolean;
  /** false 면 미리보기 — 누를 수 없다(일정 선택 중 · 완료 화면) */
  interactive: boolean;
  /** 미니맵 — 글자 · 아이콘 없이 상자만 */
  compact?: boolean;
  /** 필터에 맞지 않는 자리 — 반투명(숨기지 않는다, 지시서 19절) */
  dim?: boolean;
  /** 추천 자리(바석) — 금색 테두리 */
  star?: boolean;
  onToggle?: (id: string) => void;
}

/** 상태 · 선택 · 내 예약 · 바석 조합의 클래스 — 범례 · 선택 좌석 카드의 견본도 같은 모양을 쓴다 */
export function chairClassName(
  status: SeatStatus,
  { mine = false, selected = false, bar = false }: { mine?: boolean; selected?: boolean; bar?: boolean } = {},
): string {
  return [
    styles.chair,
    bar ? styles.chairBar : "",
    styles[`chair_${status}`],
    mine ? styles.chairMine : "",
    selected ? styles.chairSelected : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** 상태 아이콘 — 선택 ✓ · 예약(내 예약 포함) 자물쇠 · 사용 중 사람 · 수리 중 공구. 이용 가능은 번호 글자 */
export function chairGlyph(status: SeatStatus, { mine = false, selected = false } = {}) {
  if (selected) return <CheckIcon />;
  if (mine || status === "RESERVED") return <LockIcon />;
  if (status === "USING") return <PersonIcon />;
  if (status === "REPAIR") return <WrenchIcon />;
  return null;
}

/**
 * 의자 하나(버튼) — 지시서 17절의 좌석 클릭 단위. 배치도 논리 px 로 절대 배치되고 캔버스가 통째로 배율을 바꾼다.
 * 색 + 아이콘 + 텍스트(aria-label · title) 세 가지로 상태를 알린다. 히트 영역은 ::before 로 넓힌다.
 */
function ChairView({ chair, status, mine, selected, interactive, compact = false, dim = false, star = false, onToggle }: ChairProps) {
  const { seat, no } = chair;
  const className = [
    chairClassName(status, { mine, selected, bar: seat.type === "BAR" }),
    dim && !selected ? styles.chairDim : "",
    star ? styles.chairStar : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = { left: chair.x - CHAIR / 2, top: chair.y - CHAIR / 2, width: CHAIR, height: CHAIR };

  if (compact) return <span className={className} style={style} />;

  const stateLabel = selected ? "선택됨" : mine ? "내 예약" : STATUS_LABEL[status];
  const name = chairLabel(seat, no);
  const glyph = chairGlyph(status, { mine, selected });

  return (
    <button
      type="button"
      className={className}
      style={style}
      disabled={!interactive}
      aria-pressed={selected}
      aria-disabled={!selected && (mine || status !== "AVAILABLE") ? true : undefined}
      aria-label={`${name}, ${chairDescription(seat)}, ${stateLabel}${star ? ", 추천" : ""}${dim && !selected ? ", 필터와 맞지 않음" : ""}`}
      title={`${name} · ${stateLabel}`}
      data-chair={chair.id}
      data-dim={dim && !selected ? "true" : undefined}
      data-star={star ? "true" : undefined}
      onClick={() => onToggle?.(chair.id)}
    >
      {glyph ?? (
        <span className={styles.chairNo} aria-hidden>
          {chairShort(seat, no)}
        </span>
      )}
    </button>
  );
}

export default memo(ChairView);
