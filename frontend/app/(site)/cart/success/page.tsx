import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentSuccess } from "../_components/PaymentResult";

export const metadata: Metadata = { title: "결제 완료" };

/**
 * 결제 성공 — /cart/success. 토스 결제창에서 결제하면 토스가 결제 정보를 쿼리로 붙여 이 주소로 보낸다(successUrl).
 * 쿼리는 요청마다 달라 정적 셸에는 머리글만 넣고, 승인 · 영수증은 Suspense 아래에서 브라우저가 그린다.
 */
export default function CartSuccessPage() {
  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">My Order</span>
        <h1 className="title-xl">PAYMENT</h1>
      </div>
      <Suspense fallback={null}>
        <PaymentSuccess />
      </Suspense>
    </div>
  );
}
