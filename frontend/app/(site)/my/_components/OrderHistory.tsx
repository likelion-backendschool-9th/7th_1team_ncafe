"use client";

import Link from "next/link";
import { useUser } from "@/components/UserProvider";
import type { Order } from "@/types/common";
import { useShowMore } from "../_hooks/useShowMore";
import { formatDateTime, serial, won } from "../_lib/format";
import { SectionEmpty, SectionHead, ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 3;

/** 주문 내역 — 최신순 영수증 카드. 처음엔 최근 3건, "전체 보기"로 나머지를 펼친다. */
export default function OrderHistory() {
  const { orders } = useUser();
  const { visible, expanded, hasMore, total, toggle } = useShowMore(orders, PREVIEW);

  return (
    <section id="orders" className={styles.section} aria-labelledby="orders-title">
      <SectionHead id="orders" label="ORDERS" title="주문 내역" meta={`${orders.length}건`} />

      {orders.length === 0 ? (
        <SectionEmpty
          title="아직 주문 내역이 없어요"
          action={
            <Link href="/menu" className="btn btn-outline btn-sm">
              메뉴판 보러 가기
            </Link>
          }
        >
          메뉴를 장바구니에 담아 주문하면 여기에 쌓여요.
        </SectionEmpty>
      ) : (
        <>
          <ol id="orders-list" className={styles.orderList}>
            {visible.map((order) => (
              <OrderCard key={order.orderNo} order={order} />
            ))}
          </ol>
          {hasMore && <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="orders-list" />}
        </>
      )}
    </section>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <li className={styles.order}>
      <div className={styles.orderHead}>
        <span className={styles.orderNo}>ORDER No.{serial(order.orderNo)}</span>
        <time className={styles.orderAt} dateTime={order.orderedAt}>
          {formatDateTime(order.orderedAt)}
        </time>
        <span className={styles.orderCoupon}>쿠폰 +{order.couponReward}</span>
      </div>

      <ul className={styles.orderLines}>
        {order.lines.map((line) => (
          <li key={line.key} className={styles.orderLine}>
            <span className={styles.orderLineName}>
              <Link href={`/menu/${line.menuId}`}>{line.name}</Link>
              {line.size && (
                <span className={styles.sizeTag}>
                  <span className="visually-hidden">사이즈 </span>
                  {line.size}
                </span>
              )}
            </span>
            <span className={styles.orderLineQty}>× {line.quantity}</span>
            <span className={styles.orderLineAmount}>{won(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.orderFoot}>
        <span>총 {order.count}개</span>
        <strong>{won(order.total)}</strong>
      </div>
    </li>
  );
}
