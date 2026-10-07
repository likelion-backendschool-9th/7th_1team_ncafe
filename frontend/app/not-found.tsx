import Link from "next/link";
import HorseAvatar from "@/components/HorseAvatar";
import styles from "@/components/layout.module.css";

export default function NotFound() {
  return (
    <div className="container page">
      <div className={styles.soon}>
        <span className="eyebrow">Error 404</span>
        <h1 className="title-xl">OFF TRACK</h1>
        <HorseAvatar color="#a0522d" number={7} emblem="❓" size={130} />
        <p>
          <strong>트랙을 벗어났어요.</strong> 찾으시는 페이지가 없거나 이동되었습니다.
        </p>
        <Link href="/" className="btn">
          메인 트랙으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
