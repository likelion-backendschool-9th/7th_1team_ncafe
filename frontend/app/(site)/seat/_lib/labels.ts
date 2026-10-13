// 구역 · 상태 · 특징 enum → 한글 라벨(지시서 14 · 15 · 18절). 순수 함수.
import type { Seat, SeatFeature, SeatSection, SeatStatus } from "../_types";

export const SECTION_LABEL: Record<SeatSection, { en: string; ko: string }> = {
  TRACKSIDE: { en: "TRACKSIDE", ko: "창가 좌석" },
  GRANDSTAND: { en: "GRANDSTAND", ko: "일반 좌석" },
  LOUNGE: { en: "LOUNGE", ko: "단체 좌석" },
  PADDOCK: { en: "PADDOCK BAR", ko: "바 좌석" },
};

export const STATUS_LABEL: Record<SeatStatus, string> = {
  AVAILABLE: "이용 가능",
  USING: "사용 중",
  RESERVED: "예약",
  REPAIR: "수리 중",
};

export const FEATURE_LABEL: Record<SeatFeature, string> = {
  WINDOW: "창가",
  OUTLET: "콘센트",
  QUIET: "조용한 자리",
  GROUP: "단체석",
  NEAR_COUNTER: "카운터 근처",
  BAR: "바 좌석",
};

/** "4인 테이블" · "바 좌석" */
export function seatTypeLabel(seat: Seat): string {
  return seat.type === "BAR" ? "바 좌석" : `${seat.capacity}인 테이블`;
}

/** 의자 이름 — 테이블 의자는 "T03 3번", 바석은 자리 이름 그대로 "B07" */
export function chairLabel(seat: Seat, no: number): string {
  return seat.type === "BAR" ? seat.id : `${seat.id} ${no}번`;
}

/** 의자 상자 안에 들어가는 짧은 글자 — 테이블 의자는 번호, 바석은 "B07" */
export function chairShort(seat: Seat, no: number): string {
  return seat.type === "BAR" ? seat.id : String(no);
}

/** 특징 라벨 목록(바 좌석은 타입에서 이미 드러나므로 뺀다) */
export function featureLabels(seat: Seat): string[] {
  return seat.features.filter((f) => f !== "BAR").map((f) => FEATURE_LABEL[f]);
}

/** "창가 좌석 · 4인 테이블 · 창가 · 콘센트" — 선택 좌석 카드 · 의자 aria-label 용 */
export function chairDescription(seat: Seat): string {
  return [SECTION_LABEL[seat.section].ko, seatTypeLabel(seat), ...featureLabels(seat)].join(" · ");
}
