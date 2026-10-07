"use client";

import Image from "next/image";
import { useId, useState, type FormEvent } from "react";
import type { Category, Menu, MenuBadge, MenuInput, MenuStatus } from "@/app/(site)/menu/_types";
import styles from "../../_components/admin.module.css";
import { MENU_LIMITS, type MenuErrors } from "../_lib/validateMenu";

const BADGE_OPTIONS: { value: MenuBadge | ""; label: string }[] = [
  { value: "", label: "없음" },
  { value: "BEST", label: "BEST — 인기 메뉴" },
  { value: "WINNER", label: "WINNER — 오늘의 1위 (1개만)" },
  { value: "NEW", label: "NEW — 신메뉴" },
];

const STATUS_OPTIONS: { value: MenuStatus; label: string; hint: string }[] = [
  { value: "ON_SALE", label: "판매중", hint: "메뉴판에 보입니다" },
  { value: "SOLD_OUT", label: "품절", hint: "메뉴판에 '품절'로 보입니다" },
  { value: "HIDDEN", label: "숨김", hint: "메뉴판에서 숨깁니다" },
];

interface MenuFormProps {
  initial: Menu | null; // null = 등록
  categories: Category[];
  imageOptions: { path: string; label: string }[];
  errors: MenuErrors;
  busy: boolean;
  onSubmit: (input: MenuInput) => void;
  onCancel: () => void;
}

/** 폼 입력값 — 가격은 입력 중 문자열로 들고 있다가 제출 시 숫자로 바꾼다. */
interface Draft {
  categoryId: string;
  name: string;
  engName: string;
  price: string;
  description: string;
  image: string;
  badge: MenuBadge | "";
  status: MenuStatus;
}

function toDraft(menu: Menu | null, categories: Category[], imageOptions: { path: string }[]): Draft {
  return {
    categoryId: String(menu?.categoryId ?? categories[0]?.id ?? ""),
    name: menu?.name ?? "",
    engName: menu?.engName ?? "",
    price: menu ? String(menu.price) : "",
    description: menu?.description ?? "",
    image: menu?.image ?? imageOptions[0]?.path ?? "",
    badge: menu?.badge ?? "",
    status: menu?.status ?? "ON_SALE",
  };
}

function toInput(d: Draft): MenuInput {
  const price = d.price.trim() === "" ? Number.NaN : Number(d.price.replaceAll(",", ""));
  return {
    categoryId: Number(d.categoryId),
    name: d.name,
    engName: d.engName,
    price,
    description: d.description,
    image: d.image,
    badge: d.badge === "" ? undefined : d.badge,
    status: d.status,
  };
}

/** 메뉴 등록/수정 폼 — 검증은 useMenuAdmin.save 가 하고, 결과(errors)를 받아 필드 옆에 보여 준다. */
export default function MenuForm({ initial, categories, imageOptions, errors, busy, onSubmit, onCancel }: MenuFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial, categories, imageOptions));
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(toInput(draft));
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.dialogTitle}>{initial ? "메뉴 수정" : "메뉴 등록"}</h2>

      {errorCount > 0 && (
        <p className={styles.formAlert} role="alert">
          입력값을 확인해 주세요. ({errorCount}개 항목)
        </p>
      )}

      <div className={styles.formGrid}>
        <Field id={id("name")} label="메뉴 이름" required error={errors.name}>
          <input
            id={id("name")}
            className={styles.input}
            value={draft.name}
            maxLength={MENU_LIMITS.nameMax + 10}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${id("name")}-err` : undefined}
          />
        </Field>

        <Field id={id("engName")} label="영문명" required error={errors.engName}>
          <input
            id={id("engName")}
            className={styles.input}
            value={draft.engName}
            onChange={(e) => set("engName", e.target.value)}
            aria-invalid={!!errors.engName}
            aria-describedby={errors.engName ? `${id("engName")}-err` : undefined}
          />
        </Field>

        <Field id={id("categoryId")} label="카테고리" required error={errors.categoryId}>
          <select
            id={id("categoryId")}
            className={styles.input}
            value={draft.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            aria-invalid={!!errors.categoryId}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.engName}){c.visible ? "" : " — 숨김"}
              </option>
            ))}
          </select>
        </Field>

        <Field id={id("price")} label="가격 (원)" required error={errors.price} hint="100원 단위">
          <input
            id={id("price")}
            className={styles.input}
            inputMode="numeric"
            value={draft.price}
            placeholder="4500"
            onChange={(e) => set("price", e.target.value)}
            aria-invalid={!!errors.price}
            aria-describedby={errors.price ? `${id("price")}-err` : undefined}
          />
        </Field>

        <Field
          id={id("description")}
          label="설명"
          error={errors.description}
          hint={`${draft.description.trim().length} / ${MENU_LIMITS.descriptionMax}자`}
          wide
        >
          <textarea
            id={id("description")}
            className={`${styles.input} ${styles.textarea}`}
            rows={2}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            aria-invalid={!!errors.description}
          />
        </Field>

        <Field id={id("image")} label="이미지" required error={errors.image} wide>
          <div className={styles.imagePicker}>
            {draft.image.startsWith("/") && (
              <Image src={draft.image} alt="" width={64} height={64} unoptimized className={styles.thumbLg} />
            )}
            <select
              id={id("image")}
              className={styles.input}
              value={imageOptions.some((o) => o.path === draft.image) ? draft.image : ""}
              onChange={(e) => set("image", e.target.value)}
              aria-invalid={!!errors.image}
            >
              {!imageOptions.some((o) => o.path === draft.image) && <option value="">직접 입력한 경로</option>}
              {imageOptions.map((o) => (
                <option key={o.path} value={o.path}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <input
            className={`${styles.input} ${styles.pathInput}`}
            aria-label="이미지 경로 직접 입력"
            value={draft.image}
            onChange={(e) => set("image", e.target.value)}
            placeholder="/images/menus/xxx.svg"
          />
        </Field>

        <Field id={id("badge")} label="배지" error={errors.badge}>
          <select
            id={id("badge")}
            className={styles.input}
            value={draft.badge}
            onChange={(e) => set("badge", e.target.value as MenuBadge | "")}
            aria-invalid={!!errors.badge}
            aria-describedby={errors.badge ? `${id("badge")}-err` : undefined}
          >
            {BADGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <fieldset className={styles.field}>
          <legend className={styles.label}>판매 상태</legend>
          <div className={styles.radioRow}>
            {STATUS_OPTIONS.map((o) => (
              <label key={o.value} className={styles.radio} title={o.hint}>
                <input
                  type="radio"
                  name={id("status")}
                  checked={draft.status === o.value}
                  onChange={() => set("status", o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
          <span className={styles.hint}>{STATUS_OPTIONS.find((o) => o.value === draft.status)?.hint}</span>
        </fieldset>
      </div>

      <div className={styles.dialogActions}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn-gold" disabled={busy}>
          {initial ? "저장" : "등록"}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  wide,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-label="필수">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span id={`${id}-err`} className={styles.error}>
          {error}
        </span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  );
}
