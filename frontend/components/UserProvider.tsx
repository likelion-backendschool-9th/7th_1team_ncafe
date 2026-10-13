"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { RaceBet } from "@/app/(site)/race/_types";
import type { CouponLog, CouponReason, Order, RaceEntry, UserState } from "@/types/common";

// "내 것" Context — 쿠폰 · 찜한 메뉴 · 주문 내역 · 내 레이스 기록. 로그인이 없으므로 Mock 사용자 1명 기준이다.
// Header(쿠폰 칩) · /race(걸기 · 내가 건 말) · RaceSettlement(정산) · /cart(주문 적립·기록) · /menu/[id](찜) · /my 가 같은 값을 본다.
// 쿠폰 수는 spendCoupon · earnCoupons 로만 바뀌고, 바뀔 때마다 couponHistory 맨 앞에 한 줄이 남는다.
// React State 에만 두므로 새로고침하면 초기화된다(프로토타입).
// Mock 초기값 — 백엔드 연결 시 GET /api/my/coupons · /api/my/favorites · /api/my/orders · /api/my/races 결과로 초기화한다.
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
  // spendCoupon 은 결과를 바로 돌려줘야 하므로 최신 값을 ref 로도 들고 있는다
  // (같은 틱에 두 번 불려도 렌더 전 값으로 두 번 통과하지 않게).
  const walletRef = useRef(wallet);

  const commit = useCallback((next: Wallet) => {
    walletRef.current = next;
    setWallet(next);
  }, []);

  const spendCoupon = useCallback(
    (reason: CouponReason, label: string) => {
      const current = walletRef.current;
      if (current.coupons <= 0) return false;
      commit({ coupons: current.coupons - 1, history: [makeLog(reason, -1, label), ...current.history] });
      return true;
    },
    [commit],
  );

  const earnCoupons = useCallback(
    (amount: number, reason: CouponReason, label: string) => {
      if (!Number.isInteger(amount) || amount <= 0) return;
      const current = walletRef.current;
      commit({ coupons: current.coupons + amount, history: [makeLog(reason, amount, label), ...current.history] });
    },
    [commit],
  );

  // 이미 찜했으면 해제, 아니면 맨 앞에 추가(최근 찜한 순)
  const toggleFavorite = useCallback((menuId: number) => {
    setFavorites((prev) => (prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [menuId, ...prev]));
  }, []);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  // 내 레이스 기록 — 걸기 · 정산 모두 경주당 한 번이어야 하므로 지갑처럼 최신 값을 ref 로도 들고 있는다
  const [races, setRaces] = useState<RaceEntry[]>([]);
  const racesRef = useRef(races);

  const commitRaces = useCallback((next: RaceEntry[]) => {
    racesRef.current = next;
    setRaces(next);
  }, []);

  // 쿠폰을 건 경주를 맨 앞에(최신순) — 순위 · 돌려받은 쿠폰은 정산 때 채운다
  const joinRace = useCallback(
    (bet: RaceBet, gate: number) => {
      const current = racesRef.current;
      if (current.some((r) => r.raceNo === bet.raceNo)) return false;
      commitRaces([{ ...bet, gate, rank: null, payout: 0, settledAt: null }, ...current]);
      return true;
    },
    [commitRaces],
  );

  // 정산 결과 기록 — 이미 정산한 경주면 false. 호출한 쪽은 true 일 때만 쿠폰을 돌려준다(두 번 지급 방지)
  const settleRace = useCallback(
    (raceNo: number, rank: number, payout: number) => {
      const current = racesRef.current;
      const entry = current.find((r) => r.raceNo === raceNo);
      if (!entry || entry.settledAt !== null) return false;
      const settled: RaceEntry = { ...entry, rank, payout, settledAt: new Date().toISOString() };
      commitRaces(current.map((r) => (r === entry ? settled : r)));
      return true;
    },
    [commitRaces],
  );

  const value = useMemo(
    () => ({
      coupons: wallet.coupons,
      couponHistory: wallet.history,
      spendCoupon,
      earnCoupons,
      favorites,
      toggleFavorite,
      orders,
      addOrder,
      races,
      joinRace,
      settleRace,
    }),
    [wallet, spendCoupon, earnCoupons, favorites, toggleFavorite, orders, addOrder, races, joinRace, settleRace],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser 는 UserProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
