import nextRacePhoto from "@/public/images/hero/next-race.jpg";
import type { HeroSlide } from "../_types";

// 히어로는 4슬라이드 대시보드형(NEXT RACE · 오늘의 WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트)을 전제로 하되,
// 지금은 NEXT RACE 한 장만 둔다. 나머지 슬라이드는 6단계(카운트다운)·14단계(대시보드)에서
// 각 라우트의 Service 값으로 채운다. 사진 출처는 public/images/hero/CREDITS.md.
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "next-race",
    tab: { label: "DAILY RACE", title: "NEXT RACE 준비 중" },
    eyebrow: "DAILY CAFE RACE",
    title: "NEXT RACE",
    headline: "첫 번째 레이스를 준비하고 있어요",
    description:
      "출전표와 카운트다운이 곧 공개됩니다. 쿠폰 한 장으로 7마리 말 중 하나를 응원하고, 우승하면 음료 보상을 받아 가세요.",
    status: "COMING SOON",
    cta: { label: "RACE 페이지 보기", href: "/race" },
    image: nextRacePhoto,
    imageAlt: "커다란 아이스 커피 컵을 둘러싼 트랙을 번호 조끼를 입은 귀여운 말들이 달리는 일러스트",
    imagePosition: "center",
  },
];
