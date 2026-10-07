import type { Menu } from "../_types";

/** 관리자 폼에서 고를 수 있는 메뉴 일러스트 */
export const MENU_IMAGES: { path: string; label: string }[] = [
  { path: "/images/menus/hot-coffee.svg", label: "따뜻한 커피" },
  { path: "/images/menus/iced-coffee.svg", label: "아이스 커피" },
  { path: "/images/menus/latte.svg", label: "라떼" },
  { path: "/images/menus/chocolate.svg", label: "초코" },
  { path: "/images/menus/smoothie.svg", label: "스무디" },
  { path: "/images/menus/lemonade.svg", label: "에이드" },
  { path: "/images/menus/tea.svg", label: "티" },
  { path: "/images/menus/matcha.svg", label: "말차" },
  { path: "/images/menus/cake.svg", label: "케이크" },
  { path: "/images/menus/cookie.svg", label: "쿠키" },
];

// 관리자 화면 확인용으로 SOLD_OUT · HIDDEN 을 하나씩 섞어 둔다.
export const MENUS: Menu[] = [
  // ── 커피 ──
  { id: 1, categoryId: 1, name: "아메리카노", engName: "Americano", price: 4000, description: "출발 신호처럼 깔끔한 기본 블렌드", image: "/images/menus/hot-coffee.svg", badge: "BEST", status: "ON_SALE" },
  { id: 2, categoryId: 1, name: "아이스 아메리카노", engName: "Iced Americano", price: 4500, description: "오늘의 우승 메뉴, 트랙 위의 청량함", image: "/images/menus/iced-coffee.svg", badge: "WINNER", status: "ON_SALE" },
  { id: 3, categoryId: 1, name: "카페 라떼", engName: "Caffe Latte", price: 5000, description: "Latte 처럼 안정적으로 부드러운 한 잔", image: "/images/menus/latte.svg", badge: "BEST", status: "ON_SALE" },
  { id: 4, categoryId: 1, name: "바닐라 라떼", engName: "Vanilla Latte", price: 5500, description: "느긋하지만 꾸준한 달콤함", image: "/images/menus/latte.svg", status: "ON_SALE" },
  { id: 5, categoryId: 1, name: "카라멜 마키아토", engName: "Caramel Macchiato", price: 5800, description: "올라운더 Caramel 의 시그니처", image: "/images/menus/latte.svg", badge: "NEW", status: "ON_SALE" },
  { id: 6, categoryId: 1, name: "에스프레소", engName: "Espresso", price: 3500, description: "짧고 강하게, 한 모금의 승부", image: "/images/menus/hot-coffee.svg", status: "ON_SALE" },

  // ── 논커피 ──
  { id: 7, categoryId: 2, name: "초코 라떼", engName: "Chocolate Latte", price: 5500, description: "막판 스퍼트가 필요한 날의 진한 초코", image: "/images/menus/chocolate.svg", status: "ON_SALE" },
  { id: 8, categoryId: 2, name: "딸기 스무디", engName: "Strawberry Smoothie", price: 6000, description: "제철 딸기를 통째로 갈아 넣은 스무디", image: "/images/menus/smoothie.svg", status: "SOLD_OUT" },
  { id: 9, categoryId: 2, name: "레몬에이드", engName: "Lemonade", price: 5500, description: "결승선을 통과한 듯 상쾌한 탄산", image: "/images/menus/lemonade.svg", status: "ON_SALE" },

  // ── 티 ──
  { id: 10, categoryId: 3, name: "얼그레이", engName: "Earl Grey", price: 4800, description: "클래식 스포츠 클럽의 오후 홍차", image: "/images/menus/tea.svg", status: "ON_SALE" },
  { id: 11, categoryId: 3, name: "캐모마일", engName: "Chamomile", price: 4800, description: "경기 후 마음을 가라앉히는 허브티", image: "/images/menus/tea.svg", status: "ON_SALE" },
  { id: 12, categoryId: 3, name: "말차 라떼", engName: "Matcha Latte", price: 5800, description: "잔디 트랙을 닮은 진한 녹차", image: "/images/menus/matcha.svg", badge: "BEST", status: "ON_SALE" },

  // ── 디저트 ──
  { id: 13, categoryId: 4, name: "당근 케이크", engName: "Carrot Cake", price: 6500, description: "말들이 가장 좋아하는 당근으로 만든 케이크", image: "/images/menus/cake.svg", badge: "BEST", status: "ON_SALE" },
  { id: 14, categoryId: 4, name: "말발굽 쿠키", engName: "Horseshoe Cookie", price: 3000, description: "행운을 부르는 말발굽 모양 버터 쿠키", image: "/images/menus/cookie.svg", badge: "NEW", status: "ON_SALE" },
  { id: 15, categoryId: 4, name: "치즈케이크", engName: "Cheesecake", price: 6000, description: "시즌 오프로 잠시 쉬어 가는 메뉴", image: "/images/menus/cake.svg", status: "HIDDEN" },
];
