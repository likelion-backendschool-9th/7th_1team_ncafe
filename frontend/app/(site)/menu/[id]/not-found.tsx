import Link from "next/link";
import HorseAvatar from "@/components/HorseAvatar";
import styles from "@/components/layout.module.css";

/** 메뉴판에 없는 메뉴(HIDDEN · 숨김 카테고리 · 없는 id) — 사이트 Header/Footer 안에서 보인다. */
export default function MenuNotFound() {
  return (
    <div className="container page">
      <div className={styles.soon}>
        <span className="eyebrow">Error 404</span>
        <h1 className="title-xl">SCRATCHED</h1>
        <HorseAvatar color="#a0522d" number={7} emblem="☕" size={130} />
        <p>
          <strong>출전이 취소된 메뉴예요.</strong> 지금은 판매하지 않거나 주소가 잘못되었어요.
        </p>
        <Link href="/menu" className="btn">
          메뉴판으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
