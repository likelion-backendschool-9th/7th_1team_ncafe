import Link from "next/link";
import HorseAvatar from "./HorseAvatar";
import styles from "./layout.module.css";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description: string;
  step: string; // "4단계 — 메뉴 조회"
}

/**
 * 아직 구현되지 않은 사용자 페이지의 임시 화면. 각 기능 단계에서 실제 페이지로 교체하고,
 * 모든 페이지가 교체되면 이 파일을 지운다.
 */
export default function ComingSoon({ eyebrow, title, description, step }: ComingSoonProps) {
  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="title-xl">{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      <div className={styles.soon}>
        <HorseAvatar color="#c98a3a" number={1} emblem="🚧" size={120} />
        <p>
          <strong>출발 준비 중입니다.</strong> 곧 게이트가 열려요!
        </p>
        <p className="subtitle">구현 예정: {step}</p>
        <Link href="/" className="btn btn-outline">
          홈으로
        </Link>
      </div>
    </div>
  );
}
