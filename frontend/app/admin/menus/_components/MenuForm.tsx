"use client";

import Image from "next/image";
import { useId, useState, type FormEvent } from "react";
import { MENU_SIZES } from "@/app/(site)/menu/_lib/menuSize";
import type { Category, GradeInfo, Menu, MenuBadge, MenuInput, MenuSize, MenuStatus, SizePrices } from "@/app/(site)/menu/_types";
import styles from "../../_components/admin.module.css";
import { MENU_LIMITS, type MenuErrors } from "../_lib/validateMenu";

const BADGE_OPTIONS: { value: MenuBadge | ""; label: string }[] = [
  { value: "", label: "없음" },
  { value: "BEST", label: "BEST — 인기 메뉴" },
  { value: "WINNER", label: "WINNER — 오늘의 1위 (1개만)" },
  { value: "NEW", label: "NEW — 신메뉴" },
];

// 판매 상태는 지점별이라 이 폼에서 정하지 않는다 — 메뉴 관리 표에서 지점을 고르고 바꾼다.

interface MenuFormProps {
  initial: Menu | null; // null = 등록
  categories: Category[];
  /** 해금 등급 선택지(낮은 등급부터) */
  grades: GradeInfo[];
  imageOptions: { path: string; label: string }[];
  errors: MenuErrors;
  busy: boolean;
  onSubmit: (input: MenuInput) => void;
  onCancel: () => void;
}

/**
 * 폼 입력값 — 가격은 입력 중 문자열로 들고 있다가 제출 시 숫자로 바꾼다.
 * sized 면 사이즈별 가격 4칸을, 아니면 가격 1칸을 쓴다. 둘 다 들고 있어서 체크를 껐다 켜도 입력이 남는다.
 */
interface Draft {
  categoryId: string;
  name: string;
  engName: string;
  sized: boolean;
  price: string;
  sizePrices: Record<MenuSize, string>;
  description: string;
  image: string;
  badge: MenuBadge | "";
  status: MenuStatus;
  requiredGradeId: string; // "" = 누구나
}

const toText = (n: number | undefined) => (n === undefined ? "" : String(n));
const toNumber = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replaceAll(",", "")));

function toDraft(menu: Menu | null, categories: Category[], imageOptions: { path: string }[]): Draft {
  const sp = menu?.sizePrices ?? undefined;
  return {
    categoryId: String(menu?.categoryId ?? categories[0]?.id ?? ""),
    name: menu?.name ?? "",
    engName: menu?.engName ?? "",
    sized: menu ? menu.sizePrices !== null : true, // 새 메뉴는 음료가 많아 사이즈를 켜 둔다
    price: toText(menu?.price),
    sizePrices: { S: toText(sp?.S), M: toText(sp?.M), L: toText(sp?.L), XL: toText(sp?.XL) },
    description: menu?.description ?? "",
    image: menu?.image ?? imageOptions[0]?.path ?? "",
    badge: menu?.badge ?? "",
    status: menu?.status ?? "ON_SALE",
    requiredGradeId: menu?.requiredGrade ? String(menu.requiredGrade.id) : "",
  };
}

function toInput(d: Draft, grades: GradeInfo[]): MenuInput {
  const sizePrices: SizePrices | null = d.sized
    ? { S: toNumber(d.sizePrices.S), M: toNumber(d.sizePrices.M), L: toNumber(d.sizePrices.L), XL: toNumber(d.sizePrices.XL) }
    : null;
  return {
    categoryId: Number(d.categoryId),
    name: d.name,
    engName: d.engName,
    price: sizePrices ? sizePrices.S : toNumber(d.price), // 사이즈 메뉴의 대표 가격은 S 가격
    sizePrices,
    description: d.description,
    image: d.image,
    badge: d.badge === "" ? undefined : d.badge,
    status: d.status,
    requiredGrade: grades.find((g) => String(g.id) === d.requiredGradeId) ?? null,
  };
}

/** 메뉴 등록/수정 폼 — 검증은 useMenuAdmin.save 가 하고, 결과(errors)를 받아 필드 옆에 보여 준다. */
export default function MenuForm({ initial, categories, grades, imageOptions, errors, busy, onSubmit, onCancel }: MenuFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial, categories, imageOptions));
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setSizePrice = (size: MenuSize, value: string) =>
    setDraft((d) => ({ ...d, sizePrices: { ...d.sizePrices, [size]: value } }));

  /** 사이즈를 켜고 끌 때 비어 있는 쪽을 다른 쪽 값으로 채워 준다(단일 가격 ↔ S 가격). */
  function toggleSized(sized: boolean) {
    setDraft((d) => ({
      ...d,
      sized,
      price: !sized && d.price.trim() === "" ? d.sizePrices.S : d.price,
      sizePrices: sized && d.sizePrices.S.trim() === "" ? { ...d.sizePrices, S: d.price } : d.sizePrices,
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(toInput(draft, grades));
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

        <Field id={id("requiredGrade")} label="해금 등급">
          <select
            id={id("requiredGrade")}
            className={styles.input}
            value={draft.requiredGradeId}
            onChange={(e) => set("requiredGradeId", e.target.value)}
          >
            <option value="">없음 — 누구나 주문</option>
            {grades
              .filter((g) => g.minTotalCoupons > 0) // 가장 낮은 등급은 "없음"과 같다
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — 누적 쿠폰 {g.minTotalCoupons}장부터
                </option>
              ))}
          </select>
        </Field>

        <PriceFields
          idBase={id("price")}
          draft={draft}
          error={draft.sized ? errors.sizePrices : errors.price}
          onToggleSized={toggleSized}
          onPrice={(v) => set("price", v)}
          onSizePrice={setSizePrice}
        />

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

/** 가격 — "사이즈별 가격" 을 켜면 S · M · L · XL 4칸, 끄면 1칸(디저트처럼 사이즈가 없는 메뉴). */
function PriceFields({
  idBase,
  draft,
  error,
  onToggleSized,
  onPrice,
  onSizePrice,
}: {
  idBase: string;
  draft: Draft;
  error?: string;
  onToggleSized: (sized: boolean) => void;
  onPrice: (value: string) => void;
  onSizePrice: (size: MenuSize, value: string) => void;
}) {
  const noteId = `${idBase}-${error ? "err" : "hint"}`;

  return (
    <fieldset className={`${styles.field} ${styles.fieldWide}`}>
      <legend className={styles.label}>
        가격 (원)
        <span className={styles.required} aria-label="필수">
          *
        </span>
      </legend>
      <label className={styles.checkLine}>
        <input type="checkbox" checked={draft.sized} onChange={(e) => onToggleSized(e.target.checked)} />
        사이즈별 가격 (S · M · L · XL)
      </label>

      {draft.sized ? (
        <div className={styles.sizePriceGrid}>
          {MENU_SIZES.map((size, i) => (
            <label key={size} className={styles.sizePriceField}>
              <span className={styles.sizePriceLabel}>
                {size}
                <span className="visually-hidden"> 가격</span>
              </span>
              <input
                className={styles.input}
                inputMode="numeric"
                value={draft.sizePrices[size]}
                placeholder={String(4000 + i * 500)}
                onChange={(e) => onSizePrice(size, e.target.value)}
                aria-invalid={!!error}
                aria-describedby={noteId}
              />
            </label>
          ))}
        </div>
      ) : (
        <input
          className={`${styles.input} ${styles.priceSingle}`}
          aria-label="가격"
          inputMode="numeric"
          value={draft.price}
          placeholder="4500"
          onChange={(e) => onPrice(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={noteId}
        />
      )}

      {error ? (
        <span id={noteId} className={styles.error}>
          {error}
        </span>
      ) : (
        <span id={noteId} className={styles.hint}>
          {draft.sized ? "100원 단위 · 큰 사이즈일수록 같거나 비싸게" : "100원 단위 · 디저트처럼 사이즈가 없는 메뉴"}
        </span>
      )}
    </fieldset>
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
