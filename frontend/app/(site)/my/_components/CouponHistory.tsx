"use client";

import { useUser } from "@/components/UserProvider";
import type { CouponLog, CouponReason } from "@/types/common";
import { useShowMore } from "../_hooks/useShowMore";
import { formatDateTime } from "../_lib/format";
import { ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 5;

const REASON_LABEL: Record<CouponReason, string> = {
  ORDER: "주문",
  RACE_BET: "레이스 참가",
  RACE_PAYOUT: "레이스 보상",
};

/** 쿠폰 적립·사용 내역, 최신순. 한 줄 = 절취선으로 시각 STUB 을 나눈 작은 티켓. */
export default function CouponHistory() {
  const { couponHistory } = useUser();
  const { visible, expanded, hasMore, total, toggle } = useShowMore(couponHistory, PREVIEW);

  return (
    <div className={styles.couponHistory}>
      <h3 className={styles.subTitle}>
        적립 · 사용 내역 <span className={styles.subCount}>{couponHistory.length}건</span>
      </h3>

      {couponHistory.length === 0 ? (
        <p className={styles.subEmpty}>아직 쿠폰 내역이 없어요. 메뉴를 주문하거나 레이스에 참여하면 여기에 쌓여요.</p>
      ) : (
        <>
          <ol id="coupon-history-list" className={styles.historyList}>
            {visible.map((log) => (
              <HistoryRow key={log.id} log={log} />
            ))}
          </ol>
          {hasMore && (
            <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="coupon-history-list" />
          )}
        </>
      )}
    </div>
  );
}

function HistoryRow({ log }: { log: CouponLog }) {
  const earned = log.delta > 0;

  return (
    <li className={styles.row}>
      <time className={styles.rowAt} dateTime={log.at}>
        {formatDateTime(log.at)}
      </time>
      <div className={styles.rowBody}>
        <span className={styles.rowReason}>{REASON_LABEL[log.reason]}</span>
        <span className={styles.rowLabel}>{log.label}</span>
      </div>
      <strong className={`${styles.rowDelta} ${earned ? "" : styles.rowDeltaSpent}`}>
        <span aria-hidden>{earned ? `+${log.delta}` : `−${Math.abs(log.delta)}`}</span>
        <span className="visually-hidden">
          {earned ? `${log.delta}장 적립` : `${Math.abs(log.delta)}장 사용`}
        </span>
      </strong>
    </li>
  );
}
