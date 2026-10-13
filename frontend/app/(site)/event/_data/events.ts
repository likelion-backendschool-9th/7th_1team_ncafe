import { formatRaceTimes } from "@/lib/time";
import type { CafeEvent } from "../_types";

// 진행 중인 이벤트 Mock — 값만 둔다. 문구는 BLUEPRINT 7 "쿠폰 규칙"과 맞춘다.
// 레이스 시각은 lib/time.ts 의 RACE_TIMES 하나에서 온다(Footer · 메인 히어로와 같은 값).
export const EVENTS: CafeEvent[] = [
  {
    id: 1,
    title: "DAILY RACE",
    period: "매일",
    time: formatRaceTimes(),
    description: "쿠폰 1장으로 7마리 말 중 한 마리를 응원하세요. 내 말이 1~3위면 건 쿠폰과 함께 추가 쿠폰을 돌려받아요.",
    ctaLabel: "Race 참여하기",
    ctaHref: "/race",
  },
  {
    id: 2,
    title: "ORDER STAMP",
    period: "상시",
    description: "주문할 때마다 쿠폰 1장이 적립돼요. 담은 수량과 상관없이 주문 한 번에 한 장씩 쌓여요.",
    ctaLabel: "메뉴 보러 가기",
    ctaHref: "/menu",
  },
  {
    id: 3,
    title: "WELCOME TICKET",
    period: "첫 방문",
    description: "처음 오신 분께 레이스 쿠폰 5장을 드려요. 마이페이지에서 보유 쿠폰을 확인해 보세요.",
    ctaLabel: "내 쿠폰 보기",
    ctaHref: "/my#coupons",
  },
];
