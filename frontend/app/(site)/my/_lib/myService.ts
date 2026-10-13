// 마이페이지 도메인의 데이터 창구 — 백엔드 연결 시 이 파일만 fetch 로 교체한다.
// 쿠폰 · 찜 · 주문 내역은 UserProvider(React State)가 들고 있고, 연결 뒤에는 UserProvider 가 /api/my/* 로 초기화한다.
import { MOCK_PROFILE } from "../_data/profile";
import type { UserProfile } from "../_types";

/** GET /api/my/profile */
export async function getProfile(): Promise<UserProfile> {
  return structuredClone(MOCK_PROFILE);
}
