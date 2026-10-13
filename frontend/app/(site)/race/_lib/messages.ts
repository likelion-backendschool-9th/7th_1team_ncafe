// 경주 중 이벤트 메시지 템플릿(BLUEPRINT 8.2). 이름은 영문 대문자라 조사는 "가" 로 고정한다.
import type { RaceEventType } from "../_types";

/** 이벤트 → 화면 문구. OVERTAKE 는 올라선 순위에 따라, LEAD_BATTLE 은 두 마리 이름으로 */
export function messageFor(type: RaceEventType, name: string, extra?: { rank?: number; other?: string }): string {
  switch (type) {
    case "BOOST":
      return `🔥 ${name}가 속도를 올립니다!`;
    case "SLOW":
      return `💨 ${name}가 숨을 고릅니다…`;
    case "STUMBLE":
      return `😵 ${name}가 잠시 주춤합니다!`;
    case "SPURT":
      return `⚡ ${name}의 막판 스퍼트!`;
    case "OVERTAKE":
      return extra?.rank === 1 ? `🏇 ${name}가 선두로 나섭니다!` : `🏇 ${name}가 선두를 추격합니다!`;
    case "LEAD_BATTLE":
      return `🏁 ${name}와 ${extra?.other ?? "뒤따르는 말"}의 치열한 선두 경쟁!`;
  }
}
