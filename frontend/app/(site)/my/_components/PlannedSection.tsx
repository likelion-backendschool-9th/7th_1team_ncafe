import Link from "next/link";
import { SectionHead } from "./MySection";
import styles from "./my.module.css";

interface PlannedSectionProps {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

/**
 * 아직 기능이 없는 마이페이지 섹션의 자리 — 내 레이스 기록(9단계) · 좌석 예약 내역(11단계)에서 실제 목록으로 바꾼다.
 */
export default function PlannedSection({ id, label, title, description, href, linkLabel }: PlannedSectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <SectionHead id={id} label={label} title={title} meta={<span className={styles.soonTag}>준비 중</span>} />
      <div className={styles.planned}>
        <p>{description}</p>
        <Link href={href} className="btn btn-outline btn-sm">
          {linkLabel}
        </Link>
      </div>
    </section>
  );
}
