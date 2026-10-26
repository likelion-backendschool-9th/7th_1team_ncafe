// 이벤트 도메인 타입 — /event · /event/[id] · 관리자 이벤트 관리(/admin/event)가 eventService 를 통해 쓴다.

/** 진행 상태 — 진행 중 · 예정 · 종료 */
export type EventStatus = "ONGOING" | "UPCOMING" | "ENDED";

/** 카드 시각 칸 — 없음 · 직접 입력(time) · 경주 일정 따라가기(관리자 경주 관리의 일정 — "오늘 12:30 · 18:00") */
export type EventTimeMode = "NONE" | "TEXT" | "RACE";

export interface CafeEvent {
  id: number;
  title: string; // "DAILY RACE"
  period: string; // 운영 안내(짧게) — "매일" · "상시" · "첫 방문"
  timeMode: EventTimeMode;
  time: string; // timeMode "TEXT" 일 때 보이는 시각 문구 — "평일 15:00"
  description: string; // 카드 한 줄 설명
  steps: string[]; // 상세 — 참여 방법(순서대로)
  notes: string[]; // 상세 — 유의 사항
  startDate: string | null; // KST "YYYY-MM-DD" — null 이면 시작일 없음(이미 시작)
  endDate: string | null; // KST "YYYY-MM-DD"(그날까지 진행) — null 이면 상시(종료일 없음)
  statusOverride: EventStatus | null; // 관리자가 직접 지정한 상태 — null 이면 날짜로 자동(사용자 결정 2026-10-14)
  visible: boolean; // 노출 허가 — 켜면 진행 중이 아니어도(예정 · 종료) /event 에 보인다. 진행 중은 늘 보인다
  ctaLabel?: string; // "Race 참여하기"
  ctaHref?: string; // "/race"
}

/** 관리자 등록 · 수정 폼 값 */
export type CafeEventInput = Omit<CafeEvent, "id">;
