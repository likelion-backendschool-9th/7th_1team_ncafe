import Image from "next/image";
import Link from "next/link";
import TicketBadge from "@/components/TicketBadge";
import { ticketSerial, type MenuDetailData } from "../_lib/menuBoard";
import MenuCard from "./MenuCard";
import boardStyles from "./menu.module.css";
import styles from "./menuDetail.module.css";

/**
 * 메뉴 상세 — 메뉴판 티켓을 크게 펼친 모양(일러스트 · 이름 ···· 가격 · 설명 · 정보 · STUB).
 * 아래에는 같은 카테고리의 다른 메뉴를 메뉴판과 같은 티켓 카드로 보여 준다.
 * "메뉴판으로" 는 /menu 링크다 — 메뉴판에서 왔다면 탭·검색어가 그대로 남아 있다(MenuBoard 주석).
 */
export default function MenuDetail({ menu, category, related }: MenuDetailData) {
  const soldOut = menu.status === "SOLD_OUT";

  return (
    <>
      <nav aria-label="현재 위치" className={styles.crumbs}>
        <ol>
          <li>
            <Link href="/menu">메뉴판</Link>
          </li>
          <li>{category.name}</li>
        </ol>
      </nav>

      <article className={`${styles.ticket} ${soldOut ? styles.ticketSoldOut : ""}`} aria-labelledby="menu-title">
        <div className={styles.visual}>
          <Image src={menu.image} alt="" width={240} height={240} loading="eager" className={styles.visualImg} />
          {soldOut && (
            <span className={styles.stamp}>
              품절
              <small>SOLD OUT</small>
            </span>
          )}
        </div>

        <div className={styles.body}>
          {menu.badge && (
            <span className={styles.badge}>
              <TicketBadge tone={menu.badge} />
            </span>
          )}

          <div className={styles.leader}>
            <h1 id="menu-title" className={styles.name}>
              {menu.name}
            </h1>
            <span className={styles.dots} aria-hidden />
            <p className={styles.price}>
              {menu.price.toLocaleString("ko-KR")}
              <span className={styles.won}>원</span>
            </p>
          </div>
          <p className={styles.eng}>{menu.engName}</p>
          <p className={styles.desc}>{menu.description}</p>

          <dl className={styles.facts}>
            <div>
              <dt>카테고리</dt>
              <dd>
                {category.name}
                <span className={styles.factEng}>{category.engName}</span>
              </dd>
            </div>
            <div>
              <dt>판매 상태</dt>
              <dd className={soldOut ? styles.factSoldOut : styles.factOnSale}>
                {soldOut ? "품절 — 오늘 준비한 수량이 모두 나갔어요" : "판매 중"}
              </dd>
            </div>
          </dl>

          <div className={styles.actions}>
            <Link href="/menu" className="btn btn-outline">
              <span aria-hidden>←</span> 메뉴판으로
            </Link>
          </div>
        </div>

        <div className={styles.stub} aria-hidden>
          <span className={styles.stubLabel}>STUB</span>
          <span className={styles.serial}>{ticketSerial(menu.id)}</span>
        </div>
      </article>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <div className="section-head">
            <span className="eyebrow">Same Track</span>
            <h2 id="related-title" className="title-md">
              {category.name}의 다른 메뉴
            </h2>
          </div>
          <ul className={boardStyles.grid}>
            {related.map((m) => (
              <li key={m.id}>
                <MenuCard menu={m} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * 상세를 불러오는 동안의 자리(page.tsx 의 Suspense fallback). 같은 티켓 틀이라 내용이 들어와도 덜 흔들린다.
 * 메뉴판에서 카드를 눌렀을 때 잠깐 보이고, 빌드해 둔 메뉴를 주소로 바로 열면 보이지 않는다.
 */
export function MenuDetailSkeleton() {
  return (
    <div role="status">
      <span className="visually-hidden">메뉴를 불러오는 중이에요</span>

      <div className={styles.crumbsSkeleton} aria-hidden>
        <span className={`${styles.bone} ${styles.boneCrumb}`} />
      </div>

      <div className={styles.ticket} aria-hidden>
        <div className={styles.visual} />
        <div className={styles.body}>
          <span className={`${styles.bone} ${styles.boneTitle}`} />
          <span className={`${styles.bone} ${styles.boneShort}`} />
          <span className={`${styles.bone} ${styles.boneLong}`} />
          <span className={`${styles.bone} ${styles.boneFacts}`} />
          <div className={styles.actions}>
            <span className={`${styles.bone} ${styles.boneButton}`} />
          </div>
        </div>
        <div className={styles.stub} />
      </div>
    </div>
  );
}
