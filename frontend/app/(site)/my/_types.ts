// 마이페이지 도메인 타입. 쿠폰 · 찜 · 주문처럼 여러 페이지가 함께 쓰는 값은 types/common.ts(UserState).

/** 내 정보 — 로그인이 없으므로 Mock 사용자 1명 */
export interface UserProfile {
  nickname: string; // "럭키 포니"
  memberNo: number; // 7 → "MEMBER No.0007"
  joinedAt: string; // "2026-10-01"
}
