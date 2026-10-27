// 지점 이벤트는 서버 값이다(GET /api/v1/events — 초기 데이터는 backend events_data.sql). 여기는 서버에 없는 DAILY RACE 고정 카드만 둔다.

/**
 * DAILY RACE — 지점 이벤트가 아니라 /event 맨 위에 늘 붙는 상시 고정 카드(사용자 결정 2026-10-27). 이벤트 목록 · 관리자 관리에 들지 않고,
 * 시각은 관리자 경주 관리의 일정 문구(useRaceDayText)를 그대로 보여 준다. 참여는 /race 에서 쿠폰을 거는 것이라 신청 버튼이 없다.
 */
export const DAILY_RACE = {
  title: "DAILY RACE",
  description: "쿠폰 1장으로 7마리 말 중 한 마리를 응원하세요. 내 말이 1~3위면 건 쿠폰과 함께 추가 쿠폰을 돌려받아요.",
  ctaLabel: "Race 참여하기",
  ctaHref: "/race",
} as const;
