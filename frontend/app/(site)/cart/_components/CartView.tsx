"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useCart } from "@/components/CartProvider";
import QuantityStepper from "@/components/QuantityStepper";
import type { CartLine } from "@/types/common";
import styles from "./cart.module.css";

/**
 * 장바구니 목록 + 주문 요약. 같은 메뉴라도 사이즈가 다르면 다른 줄이다.
 * 줄을 지우거나 전체 삭제하면 포커스를 제목으로 옮긴다(지운 버튼이 사라져 포커스가 길을 잃지 않게) —
 * 목록 제목과 빈 상태 제목은 동시에 보이지 않으므로 같은 id 를 쓴다.
 * 주문은 아직 없다 — "주문하기" 는 준비 중으로 막아 둔다.
 */
export default function CartView() {
  const { lines, count, total, setQuantity, remove, clear } = useCart();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const headingId = useId();

  const focusHeading = () => requestAnimationFrame(() => document.getElementById(headingId)?.focus());

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
        <button type="button" className="btn btn-gold btn-block" disabled aria-describedby={`${headingId}-soon`}>
          주문하기
        </button>
        <p id={`${headingId}-soon`} className={styles.summaryNote}>
          주문 기능은 준비 중이에요.
        </p>
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
