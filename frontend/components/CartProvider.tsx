"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { addLine, cartCount, cartTotal, removeLine, setLineQuantity } from "@/lib/cart";
import type { CartItem, CartLine, CartState } from "@/types/common";

// 장바구니 Context — Header(수량) · /menu/[id](담기) · /cart 가 같은 값을 본다.
// React State 에만 두므로 페이지를 옮겨 다녀도 남지만 새로고침하면 비워진다(쿠폰과 같은 프로토타입 수준).
const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((item: CartItem, quantity: number) => {
    setLines((prev) => addLine(prev, item, quantity));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => setLineQuantity(prev, key, quantity));
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => removeLine(prev, key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: cartCount(lines), total: cartTotal(lines), add, setQuantity, remove, clear }),
    [lines, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart 는 CartProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
