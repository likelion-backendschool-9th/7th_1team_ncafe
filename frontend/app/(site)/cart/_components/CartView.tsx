"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import QuantityStepper from "@/components/QuantityStepper";
import { useUser } from "@/components/UserProvider";
import type { CartLine, Order } from "@/types/common";
import { ORDER_COUPON_REWARD, placeOrder } from "../_lib/orderService";
import styles from "./cart.module.css";

/**
 * 장바구니 목록 + 주문 요약. 같은 메뉴라도 사이즈가 다르면 다른 줄이다.
 * 줄을 지우거나 전체 삭제하면 포커스를 제목으로 옮긴다(지운 버튼이 사라져 포커스가 길을 잃지 않게) —
 * 목록 제목 · 빈 상태 제목 · 주문 완료 제목은 동시에 보이지 않으므로 같은 id 를 쓴다.
 * "주문하기" 는 결제 없는 목업이다 — 주문을 내역(마이페이지)에 남기고 쿠폰 1장을 적립한 뒤,
 * 장바구니를 비우고 완료 상태를 보여 준다.
 */
export default function CartView() {
  const { lines, count, total, setQuantity, remove, clear } = useCart();
  const { coupons, earnCoupons, addOrder } = useUser();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  // 버튼 비활성은 다음 렌더부터라, 같은 틱의 두 번째 클릭은 ref 로 막는다(쿠폰이 두 번 적립되지 않게).
  const submitting = useRef(false);
  const headingId = useId();

  // Cache Components 는 다른 페이지로 가도 이 화면을 언마운트하지 않고 <Activity> 로 숨겨 두므로 State 가 남는다.
  // 주문 완료 · 오류 · 전체 삭제 확인은 그 순간의 안내라, 숨겨질 때 처음 상태로 되돌린다
  // (그러지 않으면 메뉴를 더 담고 돌아와도 지난 주문 완료 화면이 보인다).
  useLayoutEffect(() => {
    return () => {
      setReceipt(null);
      setOrderError(false);
      setConfirmingClear(false);
    };
  }, []);

  const focusHeading = () => requestAnimationFrame(() => document.getElementById(headingId)?.focus());

  const handleOrder = async () => {
    if (submitting.current || lines.length === 0) return;
    submitting.current = true;
    setOrdering(true);
    setOrderError(false);
    try {
      const order = await placeOrder(lines);
      addOrder(order);
      earnCoupons(order.couponReward, "ORDER", `주문 적립 · ${order.summary}`);
      clear();
      setReceipt(order);
      focusHeading();
    } catch {
      setOrderError(true);
    } finally {
      submitting.current = false;
      setOrdering(false);
    }
  };

  if (receipt) {
    return (
      <div className={styles.done}>
        <span className={styles.doneSerial} aria-hidden>
          ORDER No.{String(receipt.orderNo).padStart(4, "0")}
        </span>
        <h2 id={headingId} tabIndex={-1} className={styles.emptyTitle}>
          주문이 접수됐어요
        </h2>
        <p>
          {receipt.summary} · {receipt.count}개 · {receipt.total.toLocaleString("ko-KR")}원
        </p>
        <p className={styles.doneCoupon}>
          쿠폰 <strong>{receipt.couponReward}장</strong>이 적립됐어요 · 보유 <strong>{coupons}장</strong>
        </p>
        <div className={styles.doneActions}>
          <Link href="/my#orders" className="btn">
            주문 내역 보기
          </Link>
          <Link href="/menu" className="btn btn-outline">
            메뉴판 보러 가기
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 id={headingId} tabIndex={-1} className={styles.emptyTitle}>
          장바구니가 비어 있어요
        </h2>
        <p>메뉴판에서 오늘 트랙에 오른 메뉴를 골라 담아 보세요.</p>
        <Link href="/menu" className="btn">
          메뉴판 보러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <section aria-labelledby={headingId}>
        <div className={styles.listHead}>
          <h2 id={headingId} tabIndex={-1} className={styles.listTitle}>
            담은 메뉴 <span className={styles.listCount}>{lines.length}</span>
          </h2>
          {confirmingClear ? (
            <p className={styles.clearConfirm}>
              모두 삭제할까요?
              <button
                type="button"
                className={`${styles.textButton} ${styles.textButtonDanger}`}
                onClick={() => {
                  clear();
                  setConfirmingClear(false);
                  focusHeading();
                }}
              >
                삭제
              </button>
              {/* 확인 문구로 바뀌면서 누른 버튼이 사라지므로 취소에 포커스를 둔다 */}
              <button type="button" className={styles.textButton} autoFocus onClick={() => setConfirmingClear(false)}>
                취소
              </button>
            </p>
          ) : (
            <button type="button" className={styles.textButton} onClick={() => setConfirmingClear(true)}>
              전체 삭제
            </button>
          )}
        </div>

        <ul className={styles.list}>
          {lines.map((line) => (
            <CartRow
              key={line.key}
              line={line}
              onQuantity={(q) => setQuantity(line.key, q)}
              onRemove={() => {
                remove(line.key);
                focusHeading();
              }}
            />
          ))}
        </ul>
      </section>

      <aside className={styles.summary} aria-labelledby={`${headingId}-summary`}>
        <h2 id={`${headingId}-summary`} className={styles.summaryTitle}>
          주문 요약
        </h2>
        <dl className={styles.summaryList}>
          <div>
            <dt>총 수량</dt>
            <dd>{count}개</dd>
          </div>
          <div className={styles.summaryTotal}>
            <dt>합계</dt>
            <dd>
              {total.toLocaleString("ko-KR")}
              <span className={styles.won}>원</span>
            </dd>
          </div>
        </dl>
        <p className={styles.summaryCoupon}>
          <span>주문 시 쿠폰</span>
          <strong>+{ORDER_COUPON_REWARD}장</strong>
        </p>
        <button
          type="button"
          className="btn btn-gold btn-block"
          disabled={ordering}
          aria-describedby={`${headingId}-note`}
          onClick={handleOrder}
        >
          {ordering ? "주문하는 중…" : "주문하기"}
        </button>
        <p id={`${headingId}-note`} className={styles.summaryNote}>
          결제 없이 접수만 되는 데모 주문이에요.
        </p>
        {orderError && (
          <p className={styles.summaryError} role="alert">
            주문하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <Link href="/menu" className="btn btn-outline btn-block">
          메뉴 더 담기
        </Link>
      </aside>
    </div>
  );
}

function CartRow({
  line,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const label = line.size ? `${line.name} ${line.size}` : line.name;

  return (
    <li className={styles.row}>
      <div className={styles.thumb}>
        <Image src={line.image} alt="" width={72} height={72} className={styles.thumbImg} />
      </div>

      <div className={styles.info}>
        <p className={styles.name}>
          <Link href={`/menu/${line.menuId}`}>{line.name}</Link>
          {line.size && (
            <span className={styles.sizeTag}>
              <span className="visually-hidden">사이즈 </span>
              {line.size}
            </span>
          )}
        </p>
        <p className={styles.eng}>{line.engName}</p>
        <p className={styles.unitPrice}>{line.unitPrice.toLocaleString("ko-KR")}원</p>
      </div>

      <div className={styles.qty}>
        <QuantityStepper value={line.quantity} onChange={onQuantity} label={`${label} 수량`} size="sm" />
      </div>

      <p className={styles.lineTotal}>
        <span className="visually-hidden">{label} 금액 </span>
        {(line.unitPrice * line.quantity).toLocaleString("ko-KR")}
        <span className={styles.won}>원</span>
      </p>

      <button type="button" className={styles.remove} aria-label={`${label} 삭제`} onClick={onRemove}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
