import nextRacePhoto from "@/public/images/hero/next-race.jpg";
import { formatRaceTimes } from "@/lib/time";
import type { HeroSlide } from "../_types";

// 히어로는 4슬라이드 대시보드형(NEXT RACE · 오늘의 WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트)을 전제로 하되,
// 지금은 NEXT RACE 한 장만 둔다. 이 슬라이드는 raceClock 으로 다음 경주 시각 · 카운트다운을 보여 준다(6단계).
// 나머지 슬라이드는 14단계(대시보드)에서 각 라우트의 Service 값으로 채운다. 사진 출처는 public/images/hero/CREDITS.md.
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "next-race",
    // tab.title · headline 은 시계를 읽기 전(정적 셸)에만 보인다
    tab: { label: "DAILY RACE", title: "NEXT RACE" },
    eyebrow: "DAILY CAFE RACE",
    title: "NEXT RACE",
    headline: `매일 ${formatRaceTimes()} 출발`,
    description: "쿠폰 한 장으로 7마리 말 중 하나를 응원하고, 3위 안에 들면 추가 쿠폰을 받아 가세요.",
    raceClock: true,
    cta: { label: "RACE 페이지 보기", href: "/race" },
    image: nextRacePhoto,
    imageAlt: "커다란 아이스 커피 컵을 둘러싼 트랙을 번호 조끼를 입은 귀여운 말들이 달리는 일러스트",
    imagePosition: "center",
  },
];
