import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentFail } from "../_components/PaymentResult";

export const metadata: Metadata = { title: "결제 실패" };

/**
 * 결제 실패 · 취소 — /cart/fail. 토스가 에러 코드 · 메시지를 쿼리로 붙여 이 주소로 보낸다(failUrl).
 * 쿼리는 요청마다 달라 정적 셸에는 머리글만 넣고, 안내는 Suspense 아래에서 브라우저가 그린다.
 */
export default function CartFailPage() {
  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">My Order</span>
        <h1 className="title-xl">PAYMENT</h1>
      </div>
      <Suspense fallback={null}>
        <PaymentFail />
      </Suspense>
    </div>
  );
}
