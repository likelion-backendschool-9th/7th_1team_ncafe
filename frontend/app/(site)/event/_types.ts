// 이벤트 도메인 타입 — /event 와 (14단계) 메인 대시보드가 eventService 를 통해 쓴다.

export interface CafeEvent {
  id: number;
  title: string; // "DAILY RACE"
  period: string; // "매일" · "상시" · "첫 방문"
  time?: string; // "12:30 · 18:00"
  description: string;
  ctaLabel?: string; // "Race 참여하기"
  ctaHref?: string; // "/race"
}
