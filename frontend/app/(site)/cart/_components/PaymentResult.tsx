"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import { useUser } from "@/components/UserProvider";
import type { Order } from "@/types/common";
import { completePayment, errorMessage } from "../_lib/orderService";
import styles from "./cart.module.css";

/**
 * /cart/success — 토스 결제창에서 결제하면 토스가 ?paymentType · orderId · paymentKey · amount 를 붙여 이 화면으로 보낸다.
 * 그 값으로 서버에 승인을 요청하고(금액 대조 · 토스 승인 · 쿠폰 적립 · 장바구니 정리는 서버가 한다),
 * 끝나면 Header 쿠폰 수 · 장바구니 · 주문 내역을 다시 불러온 뒤 영수증을 보여 준다.
 * 승인은 토스 결제 요청 뒤 10분 안에 해야 한다 — 로그인이 풀려 있으면 로그인 뒤 이 화면으로 돌아오게 한다.
 */
export function PaymentSuccess() {
  const params = useSearchParams();
  const paymentKey = params.get("paymentKey") ?? "";
  const pgOrderId = params.get("orderId") ?? "";
  const amount = Number(params.get("amount"));
  const valid = paymentKey !== "" && pgOrderId !== "" && Number.isInteger(amount) && amount > 0;

  const { member, loading, refresh } = useAuth();
  const memberNo = member?.no ?? null;
  const { reload } = useCart();
  const { reloadOrders } = useUser();
  const [result, setResult] = useState<{ order: Order } | { error: string } | null>(null);

  useEffect(() => {
    if (!valid || memberNo === null) return;
    let ignore = false;
    completePayment(paymentKey, pgOrderId, amount)
      .then((order) => {
        if (ignore) return;
        setResult({ order });
        void refresh(); // Header 쿠폰 수
        reload(); // 주문한 줄이 빠진 장바구니
        reloadOrders();
      })
      .catch((e: unknown) => !ignore && setResult({ error: errorMessage(e, "결제를 확인하지 못했어요.") }));
    return () => {
      ignore = true;
    };
  }, [valid, memberNo, paymentKey, pgOrderId, amount, refresh, reload, reloadOrders]);

  if (!valid) return <PaymentProblem title="결제 정보를 찾을 수 없어요" message="장바구니에서 다시 결제해 주세요." />;

  if (!loading && member === null) {
    const back = `/cart/success?${params.toString()}`;
    return (
      <div className={styles.done}>
        <h2 className={styles.emptyTitle}>로그인이 필요해요</h2>
        <p>로그인하면 이 화면으로 돌아와 결제를 마무리해요. 결제한 뒤 10분 안에 마무리해야 해요.</p>
        <div className={styles.doneActions}>
          <Link href={`/login?next=${encodeURIComponent(back)}`} className="btn">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className={styles.done} aria-busy="true">
        <p>결제를 확인하는 중…</p>
      </div>
    );
  }

  if ("error" in result) {
    return <PaymentProblem title="결제를 마치지 못했어요" message={result.error} />;
  }

  const { order } = result;
  return (
    <div className={styles.done}>
      <span className={styles.doneSerial} aria-hidden>
        ORDER No.{String(order.orderNo).padStart(4, "0")}
      </span>
      <h2 className={styles.emptyTitle}>결제가 완료됐어요</h2>
      <p>
        {order.branchName} · {order.summary} · {order.count}개 · {order.total.toLocaleString("ko-KR")}원
      </p>
      <p className={styles.doneCoupon}>
        쿠폰 <strong>{order.couponReward}장</strong>이 적립됐어요 · 보유 <strong>{member?.couponCount ?? 0}장</strong>
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

/**
 * /cart/fail — 결제창에서 결제를 그만두거나 결제가 거절되면 토스가 ?code · message · orderId 를 붙여 이 화면으로 보낸다.
 * 돈은 나가지 않았고 장바구니도 그대로다(주문은 결제 대기로 남는다).
 */
export function PaymentFail() {
  const params = useSearchParams();
  const code = params.get("code");
  if (code === "PAY_PROCESS_CANCELED") {
    return <PaymentProblem title="결제를 취소했어요" message="장바구니는 그대로 남아 있어요." />;
  }
  return (
    <PaymentProblem
      title="결제하지 못했어요"
      message={params.get("message") ?? "잠시 후 다시 시도해 주세요."}
      code={code}
    />
  );
}

function PaymentProblem({ title, message, code = null }: { title: string; message: string; code?: string | null }) {
  return (
    <div className={styles.done}>
      {code && (
        <span className={styles.doneSerial} aria-hidden>
          {code}
        </span>
      )}
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p role="alert">{message}</p>
      <div className={styles.doneActions}>
        <Link href="/cart" className="btn">
          장바구니로 돌아가기
        </Link>
        <Link href="/menu" className="btn btn-outline">
          메뉴판 보러 가기
        </Link>
      </div>
    </div>
  );
}
