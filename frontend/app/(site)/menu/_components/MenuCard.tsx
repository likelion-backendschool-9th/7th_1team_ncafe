import Image from "next/image";
import Link from "next/link";
import TicketBadge from "@/components/TicketBadge";
import { ticketSerial } from "../_lib/menuBoard";
import type { Menu } from "../_types";
import styles from "./menu.module.css";

/**
 * 경마 티켓 모양 메뉴 카드 — 좌측 일러스트, 가운데 이름(한/영)·점선 리더·가격·설명,
 * 절취선 너머 STUB 에 일련번호. 카드 어디를 눌러도 상세(/menu/[id])로 간다 —
 * 링크는 이름에만 걸고(읽히는 이름이 짧게) ::after 로 카드 전체를 덮는다.
 */
export default function MenuCard({ menu }: { menu: Menu }) {
  const soldOut = menu.status === "SOLD_OUT";

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
          <h3 className={styles.leader}>
            <Link href={`/menu/${menu.id}`} className={`${styles.name} ${styles.cardLink}`}>
              {menu.name}
            </Link>
            <span className={styles.dots} aria-hidden />
            <span className={styles.price}>
              {menu.price.toLocaleString("ko-KR")}
              <span className={styles.won}>원</span>
            </span>
          </h3>
          <p className={styles.eng}>{menu.engName}</p>
          <p className={styles.desc}>{menu.description}</p>
        </div>
      </div>

      <div className={styles.stub} aria-hidden>
        <span className={styles.stubLabel}>STUB</span>
        <span className={styles.serial}>{ticketSerial(menu.id)}</span>
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
