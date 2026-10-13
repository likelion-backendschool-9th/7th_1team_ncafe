"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useCart } from "@/components/CartProvider";
import QuantityStepper from "@/components/QuantityStepper";
import { CART_MAX_QUANTITY, lineKey } from "@/lib/cart";
import { MENU_SIZES, priceOf } from "../_lib/menuSize";
import type { Menu, MenuSize } from "../_types";
import styles from "./menuDetail.module.css";

/**
 * 상세의 주문 영역 — 사이즈(음료만) · 수량 · 합계 · [메뉴판으로] [장바구니 담기].
 * 사이즈 버튼마다 그 사이즈 가격이 적혀 있어 사이즈별 가격표 역할도 한다(기본 선택은 S).
 * 품절이면 가격은 그대로 보여 주고 고르거나 담을 수 없다.
 */
export default function AddToCart({ menu }: { menu: Menu }) {
  const { lines, add } = useCart();
  const soldOut = menu.status === "SOLD_OUT";
  const [size, setSize] = useState<MenuSize | null>(menu.sizePrices ? MENU_SIZES[0] : null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const uid = useId();

  const unitPrice = priceOf(menu, size);
  const label = size ? `${menu.name} ${size}` : menu.name;

  function handleAdd() {
    const inCart = lines.find((l) => l.key === lineKey(menu.id, size))?.quantity ?? 0;
    const added = Math.min(quantity, CART_MAX_QUANTITY - inCart);
    if (added <= 0) {
      setNotice(`${label} — 이미 최대 ${CART_MAX_QUANTITY}개를 담았어요.`);
      return;
    }
    add({ menuId: menu.id, size, name: menu.name, engName: menu.engName, image: menu.image, unitPrice }, added);
    setNotice(
      added < quantity
        ? `한 메뉴는 ${CART_MAX_QUANTITY}개까지 담을 수 있어 ${label} ${added}개만 담았어요.`
        : `장바구니에 ${label} ${added}개를 담았어요.`,
    );
    setQuantity(1);
  }

  return (
    <div className={styles.order}>
      {menu.sizePrices && (
        <fieldset className={styles.sizePicker} disabled={soldOut}>
          <legend className={styles.orderLabel}>사이즈</legend>
          <div className={styles.sizeOptions}>
            {MENU_SIZES.map((s) => (
              <label key={s} className={styles.sizeOption}>
                <input
                  type="radio"
                  name={`${uid}-size`}
                  value={s}
                  checked={size === s}
                  onChange={() => setSize(s)}
                  className="visually-hidden"
                />
                <span className={styles.sizeName}>{s}</span>
                <span className={styles.sizePrice}>
                  {priceOf(menu, s).toLocaleString("ko-KR")}
                  <span className={styles.won}>원</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={styles.orderRow}>
        <div>
          <span className={styles.orderLabel} aria-hidden>
            수량
          </span>
          <QuantityStepper value={quantity} onChange={setQuantity} label={`${label} 수량`} disabled={soldOut} />
        </div>
        <p className={styles.orderTotal}>
          합계
          <strong>
            {(unitPrice * quantity).toLocaleString("ko-KR")}
            <span className={styles.won}>원</span>
          </strong>
        </p>
      </div>

      <div className={styles.actions}>
        <Link href="/menu" className="btn btn-outline">
          <span aria-hidden>←</span> 메뉴판으로
        </Link>
        <button type="button" className={`btn btn-gold ${styles.addButton}`} disabled={soldOut} onClick={handleAdd}>
          {soldOut ? "품절" : "장바구니 담기"}
        </button>
      </div>

      <p role="status" className={styles.notice}>
        {notice && (
          <>
            {notice}{" "}
            <Link href="/cart" className={styles.noticeLink}>
              장바구니 보기 <span aria-hidden>›</span>
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
