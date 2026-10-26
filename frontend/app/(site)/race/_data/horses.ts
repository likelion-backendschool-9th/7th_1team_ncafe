import type { Horse, HorseTrait } from "../_types";

// 출전마 7마리 기본값 — 백엔드 초기 데이터(backend data.sql)와 같은 값이다. 화면의 출전마는 서버(GET /api/v1/races/horses)에서 받고,
// 이 값은 관리자 수정 폼의 "기본값으로 채우기" · 고를 수 있는 이미지와 /race/lab 실험실에 쓴다.
// 이미지는 말에셋.png 에서 이름에 어울리는 털색의 말을 골라 잘랐다(scripts/split-horses.mjs 의 PICKS).
// 그래서 이미지 조끼에 적힌 숫자는 게이트 번호(id)와 다를 수 있다(사용자 결정). 대표색은 그 조끼 색이다.
export const HORSES: Horse[] = [
  {
    id: 1,
    name: "Thunder",
    nameKo: "썬더",
    color: "#245296",
    colorName: "파랑",
    image: "/images/horses/thunder.png",
    personality: "성격 급한 에너자이저",
    trait: "FAST_START",
    description: "게이트가 열리자마자 튀어 나가는, 초반 스타트가 빠른 흑마",
  },
  {
    id: 2,
    name: "Latte",
    nameKo: "라떼",
    color: "#359b9d",
    colorName: "청록",
    image: "/images/horses/latte.png",
    personality: "차분한 모범생",
    trait: "STEADY",
    description: "처음부터 끝까지 같은 속도로, 안정적으로 달리는 말",
  },
  {
    id: 3,
    name: "Mocha",
    nameKo: "모카",
    color: "#22633c",
    colorName: "초록",
    image: "/images/horses/mocha.png",
    personality: "느긋하다 마지막에 폭발",
    trait: "LATE_SPURT",
    description: "뒤에서 기다리다 마지막 직선에서 치고 나오는, 막판 스퍼트가 강한 말",
  },
  {
    id: 4,
    name: "Espresso",
    nameKo: "에스프레소",
    color: "#de550b",
    colorName: "주황",
    image: "/images/horses/espresso.png",
    personality: "짧고 굵은 승부사",
    trait: "FAST_START",
    description: "짧고 강하게 치고 나가지만 지구력은 약한 말",
  },
  {
    id: 5,
    name: "Caramel",
    nameKo: "캐러멜",
    color: "#f0b22d",
    colorName: "노랑",
    image: "/images/horses/caramel.png",
    personality: "뭐든 무난한 올라운더",
    trait: "BALANCED",
    description: "어느 구간에서도 크게 처지지 않는 무난한 올라운더",
  },
  {
    id: 6,
    name: "Vanilla",
    nameKo: "바닐라",
    color: "#eb526e",
    colorName: "분홍",
    image: "/images/horses/vanilla.png",
    personality: "느긋한 산책가",
    trait: "STEADY",
    description: "서두르지 않지만 꾸준히 따라붙는 말",
  },
  {
    id: 7,
    name: "Cookie",
    nameKo: "쿠키",
    color: "#e4362f",
    colorName: "빨강",
    image: "/images/horses/cookie.png",
    personality: "기분파 장난꾸러기",
    trait: "WILDCARD",
    description: "그날 기분에 따라 1등도 꼴찌도 하는, 변수가 많은 말",
  },
];

export const HORSE_TRAITS: readonly HorseTrait[] = ["FAST_START", "STEADY", "LATE_SPURT", "WILDCARD", "BALANCED"];

/** 관리자 폼에서 고를 수 있는 이미지 — 출전마 7장(경기 화면도 이 이미지를 쓴다) */
export const HORSE_IMAGES: readonly string[] = HORSES.map((h) => h.image);

/** 기본값 — 관리자 폼의 "기본값으로 되돌리기" */
export function defaultHorse(id: number): Horse | null {
  return HORSES.find((h) => h.id === id) ?? null;
}
