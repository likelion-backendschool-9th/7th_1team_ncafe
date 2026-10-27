"use client";

import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import { autoStatus, crowdedOf, EVENT_STATUS_LABEL, EVENT_STATUSES, hasApplicants } from "@/app/(site)/event/_lib/eventStatus";
import type { CafeEvent, CafeEventInput, EventStatus } from "@/app/(site)/event/_types";
import { BRANCHES } from "@/app/(site)/seat/_data/branches";
import adminStyles from "../../_components/admin.module.css";
import { EVENT_LIMITS, type EventErrors } from "../_lib/validateEvent";
import styles from "./eventAdmin.module.css";

/**
 * 폼 입력값 — 날짜 · 숫자 · 이미지 경로는 입력 그대로의 글자(빈 문자열 = 없음)로, 상태는 "AUTO"(날짜 기준) 포함으로 들고 있다가
 * 제출할 때 CafeEventInput 으로 바꾼다. 참여 방법 · 유의 사항은 TEXT 칼럼 그대로 한 줄에 하나.
 */
interface Draft {
  branchId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  status: EventStatus | "AUTO";
  visible: boolean;
  coupon: boolean;
  couponAmount: string;
  capacity: string;
  description: string;
  howTo: string;
  notes: string;
  thumbnail: string;
  imageHero: string;
  imageDetail: string;
}

function toDraft(event: CafeEvent | null): Draft {
  return {
    branchId: event?.branchId ?? "",
    title: event?.title ?? "",
    dateStart: event?.dateStart ?? "",
    dateEnd: event?.dateEnd ?? "",
    status: event?.status ?? "AUTO",
    visible: event?.visible ?? false,
    coupon: event?.coupon ?? true,
    couponAmount: event?.couponAmount != null ? String(event.couponAmount) : "1",
    capacity: event?.capacity != null ? String(event.capacity) : "",
    description: event?.description ?? "",
    howTo: event?.howTo ?? "",
    notes: event?.notes ?? "",
    thumbnail: event?.thumbnail ?? "",
    imageHero: event?.imageHero ?? "",
    imageDetail: event?.imageDetail ?? "",
  };
}

/** 숫자 칸 — 0 이상의 정수만 숫자로, 그 밖(빈칸 · 소수 · 글자)은 null 이라 검증에서 걸린다 */
const toCount = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

function toInput(d: Draft): CafeEventInput {
  return {
    branchId: d.branchId,
    title: d.title,
    thumbnail: d.thumbnail.trim() || null,
    imageHero: d.imageHero.trim() || null,
    imageDetail: d.imageDetail.trim() || null,
    description: d.description,
    howTo: d.howTo,
    notes: d.notes,
    dateStart: d.dateStart || null,
    dateEnd: d.dateEnd || null,
    coupon: d.coupon,
    couponAmount: d.coupon ? toCount(d.couponAmount) : null,
    capacity: d.coupon ? toCount(d.capacity) : null,
    visible: d.visible,
    status: d.status === "AUTO" ? null : d.status,
  };
}

interface EventFormProps {
  initial: CafeEvent | null; // null = 등록
  today: string; // KST — "자동이면 지금 무엇인지" 안내
  errors: EventErrors;
  busy: boolean;
  onSubmit: (input: CafeEventInput) => void;
  onCancel: () => void;
}

/**
 * 이벤트 등록/수정 폼 — 검증은 useEventEditor.save 가 하고 결과(errors)를 필드 옆에 보여 준다.
 * 신청자가 있는 이벤트는 종류(쿠폰 지급 여부)와 지급 쿠폰 수를 글자로만 보여 주고 바꿀 수 없게 한다(사용자 결정 2026-10-27).
 */
export default function EventForm({ initial, today, errors, busy, onSubmit, onCancel }: EventFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const errorCount = Object.keys(errors).length;
  const auto = autoStatus({ dateStart: draft.dateStart || null, dateEnd: draft.dateEnd || null }, today);
  const crowded = initial ? crowdedOf(initial) : 0;
  const couponLocked = initial ? hasApplicants(initial) : false;

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(toInput(draft));
  }

  return (
    <form className={adminStyles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={adminStyles.dialogTitle}>{initial ? "이벤트 수정" : "이벤트 등록"}</h2>

      {errorCount > 0 && (
        <p className={adminStyles.formAlert} role="alert">
          입력값을 확인해 주세요. ({errorCount}개 항목)
        </p>
      )}

      <div className={adminStyles.formGrid}>
        <Field id={id("branchId")} label="작성 지점" required error={errors.branchId} hint="손님 화면 카드에 지점 이름으로 보여요">
          <select
            id={id("branchId")}
            className={adminStyles.input}
            value={draft.branchId}
            onChange={(e) => set("branchId", e.target.value)}
            aria-invalid={!!errors.branchId}
          >
            <option value="">지점 선택</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id={id("title")} label="이벤트 이름" required error={errors.title} hint="손님 화면에 크게 보여요 · 예: FIRST GATE 30">
          <input
            id={id("title")}
            className={adminStyles.input}
            value={draft.title}
            maxLength={EVENT_LIMITS.titleMax + 10}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
        </Field>

        <DateField
          id={id("dateStart")}
          label="시작일"
          value={draft.dateStart}
          error={errors.dateStart}
          emptyHint="비우면 이미 시작한 것으로 봐요"
          onChange={(v) => set("dateStart", v)}
        />
        <DateField
          id={id("dateEnd")}
          label="종료일"
          value={draft.dateEnd}
          min={draft.dateStart || undefined}
          error={errors.dateEnd}
          emptyHint="비우면 상시(종료일 없음) · 종료일 당일까지 진행 중"
          onChange={(v) => set("dateEnd", v)}
        />

        <fieldset className={`${adminStyles.field} ${adminStyles.fieldWide}`}>
          <legend className={adminStyles.label}>진행 상태</legend>
          <div className={adminStyles.radioRow}>
            <label className={adminStyles.radio}>
              <input type="radio" name={id("status")} checked={draft.status === "AUTO"} onChange={() => set("status", "AUTO")} />
              자동 (날짜 기준 · 지금 {EVENT_STATUS_LABEL[auto]})
            </label>
            {EVENT_STATUSES.map((s) => (
              <label key={s} className={adminStyles.radio}>
                <input type="radio" name={id("status")} checked={draft.status === s} onChange={() => set("status", s)} />
                {EVENT_STATUS_LABEL[s]}
              </label>
            ))}
          </div>
          <span className={adminStyles.hint}>
            {draft.status === "AUTO"
              ? "시작일 전이면 예정, 종료일이 지나면 종료로 저절로 바뀌어요. 진행 중일 때만 참여 신청을 받아요."
              : "직접 지정한 상태가 날짜보다 우선해요(예: 조기 종료). 자동으로 되돌리면 다시 날짜를 따라요."}
          </span>
        </fieldset>

        <fieldset className={`${adminStyles.field} ${adminStyles.fieldWide}`}>
          <legend className={adminStyles.label}>손님 화면 노출</legend>
          <label className={adminStyles.checkLine}>
            <input type="checkbox" checked={draft.visible} onChange={(e) => set("visible", e.target.checked)} />
            노출 허가 — 진행 중이 아니어도(예정 · 종료) /event 에 보이기
          </label>
          <span className={adminStyles.hint}>진행 중인 이벤트는 노출 허가와 상관없이 늘 보여요.</span>
        </fieldset>

        <fieldset className={`${adminStyles.field} ${adminStyles.fieldWide}`}>
          <legend className={adminStyles.label}>
            이벤트 종류
            <span className={adminStyles.required} aria-label="필수">
              *
            </span>
          </legend>
          {couponLocked ? (
            <p className={styles.locked}>
              <strong>{initial!.coupon ? `쿠폰 지급 이벤트 · 한 명에 ${initial!.couponAmount}장` : "일반 참여 이벤트 · 쿠폰 없음"}</strong>
              <span>신청자가 {initial?.coupon ? crowded : initial?.applyCount}명 있어 종류와 지급 쿠폰 수를 바꿀 수 없어요.</span>
            </p>
          ) : (
            <div className={adminStyles.radioRow}>
              <label className={adminStyles.radio}>
                <input type="radio" name={id("coupon")} checked={draft.coupon} onChange={() => set("coupon", true)} />
                쿠폰 지급 — 선착순 인원 안에 신청하면 쿠폰을 줘요
              </label>
              <label className={adminStyles.radio}>
                <input type="radio" name={id("coupon")} checked={!draft.coupon} onChange={() => set("coupon", false)} />
                일반 참여 — 쿠폰 없이 신청만 받아요
              </label>
            </div>
          )}
          {errors.coupon ? (
            <span className={adminStyles.error}>{errors.coupon}</span>
          ) : (
            !couponLocked && <span className={adminStyles.hint}>신청자가 생기면 종류와 지급 쿠폰 수는 바꿀 수 없어요.</span>
          )}
        </fieldset>

        {draft.coupon && (
          <>
            {/* 잠기면 지급 쿠폰 수는 위 종류 칸에 글자로만 보인다 */}
            {!couponLocked && (
              <Field id={id("couponAmount")} label="지급 쿠폰 수" required error={errors.couponAmount} hint="신청한 한 명에게 주는 쿠폰 수">
                <span className={styles.numRow}>
                  <input
                    id={id("couponAmount")}
                    className={`${adminStyles.input} ${styles.numInput}`}
                    inputMode="numeric"
                    value={draft.couponAmount}
                    onChange={(e) => set("couponAmount", e.target.value)}
                    aria-invalid={!!errors.couponAmount}
                  />
                  장
                </span>
              </Field>
            )}
            <Field
              id={id("capacity")}
              label="선착순 인원"
              required
              error={errors.capacity}
              hint={crowded > 0 ? `지금 ${crowded}명 참여 — 그보다 적게 줄일 수 없어요` : "참여 인원이 이 인원에 닿으면 선착순 마감돼요"}
            >
              <span className={styles.numRow}>
                <input
                  id={id("capacity")}
                  className={`${adminStyles.input} ${styles.numInput}`}
                  inputMode="numeric"
                  value={draft.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  aria-invalid={!!errors.capacity}
                />
                명
              </span>
            </Field>
          </>
        )}

        <Field
          id={id("description")}
          label="설명"
          required
          error={errors.description}
          hint={`${draft.description.trim().length} / ${EVENT_LIMITS.descriptionMax}자 · 목록 카드 · 상세 머리에 보여요`}
          wide
        >
          <textarea
            id={id("description")}
            className={`${adminStyles.input} ${adminStyles.textarea}`}
            rows={2}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            aria-invalid={!!errors.description}
          />
        </Field>

        <Field
          id={id("howTo")}
          label="참여 방법"
          error={errors.howTo}
          hint={`한 줄에 하나 · 최대 ${EVENT_LIMITS.itemsMax}줄 · 상세에 번호를 붙여 보여요`}
        >
          <textarea
            id={id("howTo")}
            className={`${adminStyles.input} ${adminStyles.textarea} ${styles.listInput}`}
            rows={4}
            value={draft.howTo}
            onChange={(e) => set("howTo", e.target.value)}
            aria-invalid={!!errors.howTo}
          />
        </Field>

        <Field id={id("notes")} label="유의 사항" error={errors.notes} hint={`한 줄에 하나 · 최대 ${EVENT_LIMITS.itemsMax}줄`}>
          <textarea
            id={id("notes")}
            className={`${adminStyles.input} ${adminStyles.textarea} ${styles.listInput}`}
            rows={4}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            aria-invalid={!!errors.notes}
          />
        </Field>

        <Field id={id("thumbnail")} label="썸네일 이미지" error={errors.thumbnail} hint="목록 카드 · 비우면 이미지 없이 티켓만">
          <input
            id={id("thumbnail")}
            className={`${adminStyles.input} ${adminStyles.pathInput}`}
            value={draft.thumbnail}
            placeholder="/events/first-gate-thumb.png"
            onChange={(e) => set("thumbnail", e.target.value)}
            aria-invalid={!!errors.thumbnail}
          />
        </Field>

        <Field id={id("imageHero")} label="히어로 이미지" error={errors.imageHero} hint="상세 맨 위 넓은 이미지">
          <input
            id={id("imageHero")}
            className={`${adminStyles.input} ${adminStyles.pathInput}`}
            value={draft.imageHero}
            placeholder="/events/first-gate-hero.png"
            onChange={(e) => set("imageHero", e.target.value)}
            aria-invalid={!!errors.imageHero}
          />
        </Field>

        <Field id={id("imageDetail")} label="상세 이미지" error={errors.imageDetail} hint="상세 아래 긴 안내 이미지" wide>
          <input
            id={id("imageDetail")}
            className={`${adminStyles.input} ${adminStyles.pathInput}`}
            value={draft.imageDetail}
            placeholder="/events/first-gate-detail.png"
            onChange={(e) => set("imageDetail", e.target.value)}
            aria-invalid={!!errors.imageDetail}
          />
        </Field>
      </div>

      <div className={adminStyles.dialogActions}>
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

function DateField({
  id,
  label,
  value,
  min,
  error,
  emptyHint,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  error?: string;
  emptyHint: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={adminStyles.field}>
      <label htmlFor={id} className={adminStyles.label}>
        {label}
      </label>
      <div className={styles.dateRow}>
        <input
          id={id}
          type="date"
          className={adminStyles.input}
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
        {value && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange("")}>
            비우기<span className="visually-hidden"> {label}</span>
          </button>
        )}
      </div>
      {error ? <span className={adminStyles.error}>{error}</span> : <span className={adminStyles.hint}>{emptyHint}</span>}
    </div>
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
  children: ReactNode;
}) {
  return (
    <div className={`${adminStyles.field} ${wide ? adminStyles.fieldWide : ""}`}>
      <label htmlFor={id} className={adminStyles.label}>
        {label}
        {required && (
          <span className={adminStyles.required} aria-label="필수">
            *
          </span>
        )}
      </label>
      {children}
      {error ? <span className={adminStyles.error}>{error}</span> : hint && <span className={adminStyles.hint}>{hint}</span>}
    </div>
  );
}
