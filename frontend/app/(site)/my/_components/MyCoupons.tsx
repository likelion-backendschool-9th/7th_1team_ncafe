"use client";

import Link from "next/link";
import { useUser } from "@/components/UserProvider";
import { ORDER_COUPON_REWARD } from "../../cart/_lib/orderService";
import CouponHistory from "./CouponHistory";
import { SectionHead } from "./MySection";
import styles from "./my.module.css";

/**
 * 쿠폰 — 얻고 쓰는 곳 안내 + 적립·사용 내역. 보유 수는 맨 위 요약 전광판에도 있다.
 * 쿠폰을 메뉴로 바꾸는 교환은 규칙이 정해질 때까지 안내 문구만 둔다(BLUEPRINT 10).
 */
export default function MyCoupons() {
  const { coupons } = useUser();

  return (
    <section id="coupons" className={styles.section} aria-labelledby="coupons-title">
      <SectionHead id="coupons" label="COUPONS" title="쿠폰" meta={`보유 ${coupons}장`} />

      <div className={styles.couponInfo}>
        <div>
          <p className={styles.couponLead}>
            {coupons === 0 ? (
              <>
                쿠폰이 없어요. 메뉴를 주문하면 <strong>{ORDER_COUPON_REWARD}장</strong>이 적립돼요.
              </>
            ) : (
              "쿠폰 한 장으로 DAILY RACE 에 참여할 수 있어요."
            )}
          </p>
          <ul className={styles.couponWays}>
            <li>주문할 때마다 쿠폰 {ORDER_COUPON_REWARD}장 적립</li>
            <li>레이스에서 내 말이 1~3위면 건 쿠폰과 함께 추가 쿠폰</li>
            <li>쿠폰을 모아 메뉴로 바꾸는 교환은 준비 중이에요</li>
          </ul>
        </div>
        <div className={styles.couponActions}>
          <Link href="/race" className="btn btn-sm">
            Race 참여하기
          </Link>
          <Link href="/menu" className="btn btn-outline btn-sm">
            메뉴 주문하기
          </Link>
        </div>
      </div>

      <CouponHistory />
    </section>
  );
}
