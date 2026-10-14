"use client";

import { useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TicketBadge from "@/components/TicketBadge";
import { ticketSerial } from "../_lib/menuBoard";
import { MENU_SIZES } from "../_lib/menuSize";
import type { Menu } from "../_types";
import styles from "./menu.module.css";

/**
 * 경마 티켓 모양 메뉴 카드 — 좌측 일러스트, 가운데 이름(한/영)·설명,
 * 절취선 너머 STUB 에 STUB / No.0001 과 가격. 가격은 음료면 S · M · L · XL 한 줄씩,
 * 사이즈가 없는 메뉴(디저트)면 "ONE SIZE" 아래에 하나.
 * 카드 어디를 눌러도 상세(/menu/[id])로 간다 — 링크는 이름에만 걸고(읽히는 이름이 짧게) ::after 로 카드 전체를 덮는다.
 * 마우스를 올리면 STUB 이 절취선 위쪽부터 반쯤 찢어지고, 누르면 STUB 이 떨어져 나간 뒤 상세로 넘어간다.
 */

/** STUB 이 떨어지는 애니메이션(.ticketTorn .stub)이 끝날 즈음 이동한다 */
const TEAR_MS = 380;

export default function MenuCard({ menu }: { menu: Menu }) {
  const router = useRouter();
  const [torn, setTorn] = useState(false);
  const soldOut = menu.status === "SOLD_OUT";
  const sizePrices = menu.sizePrices;
  const href = `/menu/${menu.id}`;

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // 새 탭·새 창으로 여는 클릭은 브라우저에 맡긴다
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    if (torn) return;
    setTorn(true);
    window.setTimeout(() => router.push(href), TEAR_MS);
  }

  return (
    <article
      className={`${styles.ticket} ${soldOut ? styles.ticketSoldOut : ""} ${torn ? styles.ticketTorn : ""}`}
    >
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
          <h3 className={styles.title}>
            <Link href={href} className={styles.cardLink} onClick={handleClick}>
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
