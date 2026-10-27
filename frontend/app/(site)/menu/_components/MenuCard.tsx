import Image from "next/image";
import Link from "next/link";
import TicketBadge from "@/components/TicketBadge";
import { ticketSerial } from "../_lib/menuBoard";
import { MENU_SIZES } from "../_lib/menuSize";
import type { GradeInfo, Menu } from "../_types";
import styles from "./menu.module.css";

/**
 * 경마 티켓 모양 메뉴 카드 — 좌측 일러스트, 가운데 이름(한/영)·설명,
 * 절취선 너머 STUB 에 STUB / No.0001 과 가격. 가격은 음료면 S · M · L · XL 한 줄씩,
 * 사이즈가 없는 메뉴(디저트)면 "ONE SIZE" 아래에 하나.
 * 잠긴 메뉴(lockedBy: 필요한 등급)는 이름 위에 "준마부터"처럼 표시한다 — 상세는 열 수 있지만 담을 수는 없다.
 * 카드 어디를 눌러도 상세(/menu/[id])로 간다 — 링크는 이름에만 걸고(읽히는 이름이 짧게) ::after 로 카드 전체를 덮는다.
 */
export default function MenuCard({ menu, lockedBy = null }: { menu: Menu; lockedBy?: GradeInfo | null }) {
  const soldOut = menu.status === "SOLD_OUT";
  const sizePrices = menu.sizePrices;

  return (
    <article className={`${styles.ticket} ${soldOut ? styles.ticketSoldOut : ""}`}>
      <div className={styles.main}>
        <div className={styles.thumb}>
          <Image src={menu.image} alt="" width={120} height={120} className={styles.thumbImg} />
        </div>

        <div className={styles.info}>
          {menu.badge && (
            <span className={styles.badge}>
              <TicketBadge tone={menu.badge} />
            </span>
          )}
          {lockedBy && (
            <span className={styles.lockTag}>
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              {lockedBy.name}부터
            </span>
          )}
          <h3 className={styles.title}>
            <Link href={`/menu/${menu.id}`} className={styles.cardLink}>
              {menu.name}
            </Link>
          </h3>
          <p className={styles.eng}>{menu.engName}</p>
          <p className={styles.desc}>{menu.description}</p>
        </div>
      </div>

      {/* STUB · 일련번호는 장식이라 읽지 않고, 사이즈별 가격은 읽는다 */}
      <div className={styles.stub}>
        <div className={styles.stubHead} aria-hidden>
          <span className={styles.stubLabel}>STUB</span>
          <span className={styles.serial}>{ticketSerial(menu.id)}</span>
        </div>

        <dl className={styles.sizes}>
          {sizePrices ? (
            MENU_SIZES.map((size) => (
              <div key={size} className={styles.sizeRow}>
                <dt>
                  {size}
                  <span className="visually-hidden"> 사이즈</span>
                </dt>
                <dd>
                  {sizePrices[size].toLocaleString("ko-KR")}
                  <span className={styles.won}>원</span>
                </dd>
              </div>
            ))
          ) : (
            <div className={styles.oneSize}>
              <dt>ONE SIZE</dt>
              <dd>
                {menu.price.toLocaleString("ko-KR")}
                <span className={styles.won}>원</span>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {soldOut && (
        <span className={styles.stamp}>
          품절
          <small>SOLD OUT</small>
        </span>
      )}
    </article>
  );
}
