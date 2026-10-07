"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Coupon, UserState } from "@/types/common";

// 쿠폰 Context 뼈대(1단계). 동작 검증과 화면 연결은 5단계(쿠폰 지갑 & 이벤트)에서 완성한다.
// Mock 초기값 — 백엔드 연결 시 GET /api/my/coupons 결과로 초기화한다.
export const INITIAL_COUPONS = 5;

const UserContext = createContext<UserState | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);
  const [rewards, setRewards] = useState<Coupon[]>([]);

  const spendCoupon = useCallback(() => {
    if (coupons <= 0) return false;
    setCoupons((c) => Math.max(0, c - 1));
    return true;
  }, [coupons]);

  const addReward = useCallback((c: Coupon) => {
    setRewards((prev) => [c, ...prev]);
  }, []);

  const value = useMemo(
    () => ({ coupons, rewards, spendCoupon, addReward }),
    [coupons, rewards, spendCoupon, addReward],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser 는 UserProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
