import type { Metadata } from "next";
import CouponAdmin from "./_components/CouponAdmin";

export const metadata: Metadata = { title: "쿠폰 관리" };

/** /admin/coupons — 쿠폰 관리(연패 위로 쿠폰 정책 · 지급 예정 · 지급 내역). 데이터는 관리자 API 에서 브라우저가 불러온다 */
export default function AdminCouponsPage() {
  return <CouponAdmin />;
}
