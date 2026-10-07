"use client";

import { useId, useState, type FormEvent } from "react";
import type { Category, CategoryInput } from "@/app/(site)/menu/_types";
import styles from "../../_components/admin.module.css";
import type { CategoryErrors } from "../_lib/validateCategory";

interface CategoryFormProps {
  initial: Category | null; // null = 추가
  errors: CategoryErrors;
  busy: boolean;
  onSubmit: (input: CategoryInput) => void;
  onCancel: () => void;
}

/** 카테고리 추가/이름 수정 폼 */
export default function CategoryForm({ initial, errors, busy, onSubmit, onCancel }: CategoryFormProps) {
  const [draft, setDraft] = useState<CategoryInput>({
    name: initial?.name ?? "",
    engName: initial?.engName ?? "",
    visible: initial?.visible ?? true,
  });
  const uid = useId();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(draft);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.dialogTitle}>{initial ? "카테고리 수정" : "카테고리 추가"}</h2>

      <div className={styles.field}>
        <label htmlFor={`${uid}-name`} className={styles.label}>
          이름<span className={styles.required}>*</span>
        </label>
        <input
          id={`${uid}-name`}
          className={styles.input}
          value={draft.name}
          placeholder="예: 시즌 메뉴"
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${uid}-name-err` : undefined}
        />
        {errors.name && (
          <span id={`${uid}-name-err`} className={styles.error}>
            {errors.name}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${uid}-eng`} className={styles.label}>
          영문명<span className={styles.required}>*</span>
        </label>
        <input
          id={`${uid}-eng`}
          className={styles.input}
          value={draft.engName}
          placeholder="예: Seasonal"
          onChange={(e) => setDraft((d) => ({ ...d, engName: e.target.value }))}
          aria-invalid={!!errors.engName}
          aria-describedby={errors.engName ? `${uid}-eng-err` : undefined}
        />
        {errors.engName ? (
          <span id={`${uid}-eng-err`} className={styles.error}>
            {errors.engName}
          </span>
        ) : (
          <span className={styles.hint}>메뉴판 탭에 영문으로 표시됩니다.</span>
        )}
      </div>

      <label className={styles.checkLine}>
        <input
          type="checkbox"
          checked={draft.visible}
          onChange={(e) => setDraft((d) => ({ ...d, visible: e.target.checked }))}
        />
        메뉴판에 노출
      </label>

      <div className={styles.dialogActions}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn-gold" disabled={busy}>
          {initial ? "저장" : "추가"}
        </button>
      </div>
    </form>
  );
}
