"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addCartItem,
  clearCart,
  getCart,
  mergeCart,
  removeCartItem,
  updateCartItem,
} from "@/app/(site)/cart/_lib/cartService";
import { ApiError } from "@/lib/api";
import { addLine, cartCount, cartTotal, clampQuantity, putLine, removeLine, setLineQuantity } from "@/lib/cart";
import { createLocalStore } from "@/lib/localStore";
import type { CartItem, CartLine, CartState } from "@/types/common";
import { useAuth } from "./AuthProvider";

// 장바구니 Context — Header(수량) · /menu/[id](담기) · /cart · /cart/success 가 같은 값을 본다.
// 로그인 회원은 서버 장바구니(/api/v1/me/cart), 비로그인은 이 브라우저(localStorage)에 둔다.
// 로그인하면 브라우저에 담아 둔 줄을 서버 장바구니에 합치고(merge) 브라우저 쪽은 비운다. 로그아웃해도 서버 장바구니는 남는다.
// 서버 장바구니의 수량 변경 · 삭제는 화면을 먼저 바꾸고 저장하며, 서버가 거절하면 서버 값을 다시 불러오고 이유를 error 에 남긴다.
const CartContext = createContext<CartState | null>(null);

const EMPTY: CartLine[] = [];

function isCartLine(v: unknown): v is CartLine {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.key === "string" &&
    typeof l.menuId === "number" &&
    (l.size === null || typeof l.size === "string") &&
    typeof l.name === "string" &&
    typeof l.image === "string" &&
    typeof l.unitPrice === "number" &&
    typeof l.quantity === "number"
  );
}

// 비로그인 장바구니 — 모양이 틀린 줄은 버린다
const guestCart = createLocalStore<CartLine[]>("ncafe.cart", EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter(isCartLine) : null,
);

// 로그인 직후 합치기 — 개발 모드에서 effect 가 두 번 돌아도 한 번만 합치도록 진행 중인 요청을 함께 쓴다
let merging: Promise<CartLine[]> | null = null;

/** 서버 장바구니 — 브라우저에 담아 둔 줄이 있으면 합친 결과, 없으면 그대로 */
function loadServerCart(): Promise<CartLine[]> {
  if (merging) return merging;
  const pending = guestCart.get();
  if (pending.length === 0) return getCart();
  guestCart.clear(); // 합치는 동안 다시 합치지 않게 먼저 비우고, 실패하면 되돌린다
  merging = mergeCart(pending)
    .catch((e: unknown) => {
      guestCart.set(pending);
      throw e;
    })
    .finally(() => {
      merging = null;
    });
  return merging;
}

const messageOf = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export function CartProvider({ children }: { children: ReactNode }) {
  const { member, loading: authLoading } = useAuth();
  const memberNo = member?.no ?? null;
  const guestLines = useSyncExternalStore(guestCart.subscribe, guestCart.get, guestCart.getServer);
  // 서버 장바구니는 불러온 회원과 함께 들고 있는다 — 로그아웃하거나 다른 회원이 되면 바로 버린다
  const [server, setServer] = useState<{ memberNo: number; lines: CartLine[] } | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // reload() 로 올리면 서버 장바구니를 다시 불러온다

  useEffect(() => {
    if (memberNo === null) return;
    let ignore = false;
    loadServerCart()
      .then((lines) => !ignore && setServer({ memberNo, lines }))
      .catch((e: unknown) => {
        if (ignore) return;
        setServer({ memberNo, lines: [] });
        setError(messageOf(e, "장바구니를 불러오지 못했어요."));
      });
    return () => {
      ignore = true;
    };
  }, [memberNo, version]);

  const serverLines = server !== null && server.memberNo === memberNo ? server.lines : null;
  const lines = memberNo === null ? guestLines : (serverLines ?? EMPTY);
  const loaded = !authLoading && (memberNo === null || serverLines !== null);

  // 서버가 거절했으면 화면에 먼저 바꾼 값을 버리고 서버 값을 다시 불러온다
  const fail = useCallback((e: unknown) => {
    setError(messageOf(e, "장바구니를 저장하지 못했어요."));
    setVersion((v) => v + 1);
  }, []);

  const add = useCallback(
    async (item: CartItem, quantity: number) => {
      setError("");
      if (memberNo === null) {
        guestCart.set(addLine(guestCart.get(), item, quantity));
        return;
      }
      const saved = await addCartItem(item.menuId, item.size, quantity);
      setServer((prev) => (prev?.memberNo === memberNo ? { memberNo, lines: putLine(prev.lines, saved) } : prev));
    },
    [memberNo],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      setError("");
      if (memberNo === null) {
        guestCart.set(setLineQuantity(guestCart.get(), key, quantity));
        return;
      }
      const line = serverLines?.find((l) => l.key === key);
      if (!serverLines || !line) return;
      setServer({ memberNo, lines: setLineQuantity(serverLines, key, quantity) });
      updateCartItem(line.menuId, line.size, clampQuantity(quantity)).catch(fail);
    },
    [memberNo, serverLines, fail],
  );

  const remove = useCallback(
    (key: string) => {
      setError("");
      if (memberNo === null) {
        guestCart.set(removeLine(guestCart.get(), key));
        return;
      }
      const line = serverLines?.find((l) => l.key === key);
      if (!serverLines || !line) return;
      setServer({ memberNo, lines: removeLine(serverLines, key) });
      removeCartItem(line.menuId, line.size).catch(fail);
    },
    [memberNo, serverLines, fail],
  );

  const clear = useCallback(() => {
    setError("");
    if (memberNo === null) {
      guestCart.clear();
      return;
    }
    setServer({ memberNo, lines: [] });
    clearCart().catch(fail);
  }, [memberNo, fail]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      lines,
      count: cartCount(lines),
      total: cartTotal(lines),
      loaded,
      error,
      add,
      setQuantity,
      remove,
      clear,
      reload,
    }),
    [lines, loaded, error, add, setQuantity, remove, clear, reload],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart 는 CartProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
