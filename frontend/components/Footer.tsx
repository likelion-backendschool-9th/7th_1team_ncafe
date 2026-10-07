import Link from "next/link";
import styles from "./layout.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <div className={styles.footerBrand}>
          <p className={styles.footerName}>NCAFE RACECOURSE</p>
          <p>경마장을 테마로 한 감성 카페</p>
        </div>

        <dl className={styles.footerInfo}>
          <div>
            <dt>OPEN</dt>
            <dd>매일 09:00 – 22:00</dd>
          </div>
          <div>
            <dt>ADDRESS</dt>
            <dd>서울시 마포구 트랙길 7, 1층</dd>
          </div>
          <div>
            <dt>DAILY RACE</dt>
            <dd>
              {/* 6단계에서 lib/time.ts 의 RACE_TIMES 로 교체 */}
              오늘의 레이스 12:30 · 18:00 — <Link href="/race">출전표 보기</Link>
            </dd>
          </div>
        </dl>
      </div>
      <p className={`container ${styles.disclaimer}`}>
        본 이벤트는 카페 내부 이벤트 쿠폰으로 진행되는 미니게임이며, 현금·실제 금전 거래와 무관합니다.
      </p>
    </footer>
  );
}
