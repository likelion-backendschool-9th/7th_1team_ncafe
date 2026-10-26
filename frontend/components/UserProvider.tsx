"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CouponLog, CouponReason, Order, SeatReservation, UserState } from "@/types/common";

// "내 것" Context — 쿠폰 · 찜한 메뉴 · 주문 내역 · 좌석 예약. Mock 사용자 1명 기준이다.
// Header(쿠폰 칩) · /cart(주문 적립·기록) · /menu/[id](찜) · /seat(예약 · 배치도에 내 예약 겹치기) · /my 가 같은 값을 본다.
// 쿠폰 수는 earnCoupons 로만 바뀌고, 바뀔 때마다 couponHistory 맨 앞에 한 줄이 남는다.
// 경주 걸기 · 정산 · 내 레이스 기록은 서버 값이다(lib/auth 의 couponCount, race/_lib/raceStores 의 myBetsStore) — 이 Mock 지갑과 따로 논다.
// React State 에만 두므로 새로고침하면 초기화된다(프로토타입).
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

  // 좌석 예약 · 예약대기 — /seat 가 만들고(seatService 결과), /my 가 보여 주고 취소한다. 최신순.
  const [seatReservations, setSeatReservations] = useState<SeatReservation[]>([]);

  const addSeatReservation = useCallback((reservation: SeatReservation) => {
    setSeatReservations((prev) => [reservation, ...prev]);
  }, []);

  const cancelSeatReservation = useCallback((id: string) => {
    let found = false;
    setSeatReservations((prev) => {
      const next = prev.filter((r) => r.id !== id);
      found = next.length !== prev.length;
      return next;
    });
    return found;
  }, []);

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
      addSeatReservation,
      cancelSeatReservation,
    }),
    [
      wallet,
      earnCoupons,
      favorites,
      toggleFavorite,
      orders,
      addOrder,
      seatReservations,
      addSeatReservation,
      cancelSeatReservation,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser 는 UserProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
