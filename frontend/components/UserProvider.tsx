"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { mySeatReservationsStore } from "@/app/(site)/seat/_lib/seatStores";
import { useAuth } from "@/components/AuthProvider";
import type { CouponLog, CouponReason, Order, UserState } from "@/types/common";

// "내 것" Context — 쿠폰 · 찜한 메뉴 · 주문 내역 · 좌석 예약. 쿠폰 · 찜 · 주문은 Mock 사용자 1명 기준이다.
// Header(쿠폰 칩) · /cart(주문 적립·기록) · /menu/[id](찜) · /seat(예약 · 배치도에 내 예약 겹치기) · /my 가 같은 값을 본다.
// 쿠폰 수는 earnCoupons 로만 바뀌고, 바뀔 때마다 couponHistory 맨 앞에 한 줄이 남는다.
// 경주 걸기 · 정산 · 내 레이스 기록은 서버 값이다(lib/auth 의 couponCount, race/_lib/raceStores 의 myBetsStore) — 이 Mock 지갑과 따로 논다.
// 좌석 예약도 서버 값이다(seat/_lib/seatStores 의 mySeatReservationsStore) — 로그인 회원이 바뀌면 다시 불러온다.
// 쿠폰 · 찜 · 주문은 React State 에만 두므로 새로고침하면 초기화된다(프로토타입).
// Mock 초기값 — 백엔드 연결 시 GET /api/my/coupons · /api/my/favorites · /api/my/orders 결과로 초기화한다.
export const INITIAL_COUPONS = 5;

interface Wallet {
  coupons: number;
  history: CouponLog[];
}

const UserContext = createContext<UserState | null>(null);

// Mock 내역 id — 실제로는 서버가 정한다.
let nextLogId = 1;

function makeLog(reason: CouponReason, delta: number, label: string): CouponLog {
  return { id: `log-${nextLogId++}`, reason, delta, label, at: new Date().toISOString() };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet>({ coupons: INITIAL_COUPONS, history: [] });
  const [favorites, setFavorites] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const earnCoupons = useCallback((amount: number, reason: CouponReason, label: string) => {
    if (!Number.isInteger(amount) || amount <= 0) return;
    const log = makeLog(reason, amount, label);
    setWallet((current) => ({ coupons: current.coupons + amount, history: [log, ...current.history] }));
  }, []);

  // 이미 찜했으면 해제, 아니면 맨 앞에 추가(최근 찜한 순)
  const toggleFavorite = useCallback((menuId: number) => {
    setFavorites((prev) => (prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [menuId, ...prev]));
  }, []);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  // 좌석 예약 · 예약대기 — 서버의 내 예약, 최신순. /seat 가 예약하고 /my 가 취소한 뒤 refresh 로 다시 불러온다.
  const { data: seatReservations } = useSyncExternalStore(
    mySeatReservationsStore.subscribe,
    mySeatReservationsStore.get,
    mySeatReservationsStore.getServer,
  );
  const { member } = useAuth();
  const memberNo = member?.no ?? null;
  useEffect(() => {
    void mySeatReservationsStore.refresh(); // 로그인 · 로그아웃 · 계정 전환
  }, [memberNo]);

  const refreshSeatReservations = useCallback(() => mySeatReservationsStore.refresh(), []);

  const value = useMemo(
    () => ({
      coupons: wallet.coupons,
      couponHistory: wallet.history,
      earnCoupons,
      favorites,
      toggleFavorite,
      orders,
      addOrder,
      seatReservations,
      refreshSeatReservations,
    }),
    [
      wallet,
      earnCoupons,
      favorites,
      toggleFavorite,
      orders,
      addOrder,
      seatReservations,
      refreshSeatReservations,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser 는 UserProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
