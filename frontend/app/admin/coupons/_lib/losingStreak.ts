// 연패 위로 쿠폰 관리 — 관리자 API(GET · PUT /api/v1/admin/coupons/losing-streak) · 저장소 · 입력 검증.
// 정책(몇 연패 · 몇 장 · 몇 분 뒤 · 사용 여부) + 지급 예정(지금 조건을 채운 회원) + 최근 지급 내역(coupons_log)을 한 번에 받는다.
import { api } from "@/lib/api";
import { createRemoteStore } from "@/lib/remoteStore";

export interface LosingStreakPolicy {
  loseStreak: number; // 몇 연패부터
  coupons: number; // 지급 장수
  delayMinutes: number; // 마지막 경주 정산 뒤 몇 분 뒤에
  enabled: boolean;
}

export interface LosingStreakAdmin extends LosingStreakPolicy {
  updatedTime: string;
  pending: { memberNo: number; loginId: string; nickname: string; loseStreak: number; raceNo: number | null; dueTime: string }[];
  grants: { id: number; memberNo: number; loginId: string; nickname: string; coupons: number; note: string; createdDate: string }[];
}

/** 입력 범위 — 서버(admin CouponService)와 같다 */
export const LOSING_STREAK_LIMITS = {
  loseStreak: { min: 1, max: 20 },
  coupons: { min: 1, max: 10 },
  delayMinutes: { min: 0, max: 1440 },
} as const;

export type LosingStreakField = keyof typeof LOSING_STREAK_LIMITS;
export type LosingStreakErrors = Partial<Record<LosingStreakField, string>>;

/** 폼 문자열 → 정책. 틀린 칸은 errors 에 */
export function parseLosingStreak(draft: Record<LosingStreakField, string>): { value: Omit<LosingStreakPolicy, "enabled">; errors: LosingStreakErrors } {
  const errors: LosingStreakErrors = {};
  const value = { loseStreak: 0, coupons: 0, delayMinutes: 0 };
  for (const field of Object.keys(LOSING_STREAK_LIMITS) as LosingStreakField[]) {
    const { min, max } = LOSING_STREAK_LIMITS[field];
    const n = Number(draft[field]);
    if (draft[field].trim() === "" || !Number.isInteger(n) || n < min || n > max) errors[field] = `${min}~${max} 사이의 정수로 입력해 주세요.`;
    else value[field] = n;
  }
  return { value, errors };
}

export const losingStreakStore = createRemoteStore<LosingStreakAdmin | null>(
  () => api<LosingStreakAdmin>("/admin/coupons/losing-streak"),
  null,
  30_000,
);

export async function updateLosingStreak(policy: LosingStreakPolicy): Promise<LosingStreakAdmin> {
  return api<LosingStreakAdmin>("/admin/coupons/losing-streak", { method: "PUT", body: policy });
}
