import type { StaticImageData } from "next/image";

/**
 * 메인 히어로 슬라이드 하나. 하단 탭(페이지네이션) 문구와 본문 문구를 함께 가진다.
 * 구조는 4슬라이드 대시보드형(NEXT RACE · WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트)을 전제로 한다.
 */
export interface HeroSlide {
  id: string;
  /** 하단 탭 — 소제목(label) + 굵은 제목(title) */
  tab: { label: string; title: string };
  eyebrow: string; // "DAILY CAFE RACE"
  title: string; // "NEXT RACE"
  headline: string; // "첫 번째 레이스를 준비하고 있어요"
  description: string;
  /** 작은 상태 배지 문구 — "COMING SOON" 등. 없으면 표시하지 않는다 */
  status?: string;
  cta?: { label: string; href: string };
  image: StaticImageData;
  imageAlt: string;
  /** CSS object-position — 피사체가 치우친 사진의 기준점 */
  imagePosition?: string;
}
