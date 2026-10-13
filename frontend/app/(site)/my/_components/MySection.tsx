import type { ReactNode } from "react";
import styles from "./my.module.css";

/** 마이페이지 섹션 머리 — 영문 라벨 · 한글 제목 · 오른쪽 보조 정보(건수 등). h2 id 는 `${id}-title`. */
export function SectionHead({ id, label, title, meta }: { id: string; label: string; title: string; meta?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <span className={styles.sectionLabel}>{label}</span>
        <h2 id={`${id}-title`} className={styles.sectionTitle}>
          {title}
        </h2>
      </div>
      {meta !== undefined && <span className={styles.sectionMeta}>{meta}</span>}
    </div>
  );
}

/** 빈 상태 — 제목 · 설명 · 이동 버튼 */
export function SectionEmpty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      <p>{children}</p>
      {action}
    </div>
  );
}

/** 목록 아래 "전체 보기 (N) / 접기" */
export function ShowMoreButton({
  expanded,
  total,
  onToggle,
  controls,
}: {
  expanded: boolean;
  total: number;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button type="button" className={styles.showMore} aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
      {expanded ? "접기" : `전체 보기 (${total})`}
    </button>
  );
}
