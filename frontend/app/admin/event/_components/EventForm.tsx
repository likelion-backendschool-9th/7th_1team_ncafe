"use client";

import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import { autoStatus, EVENT_STATUS_LABEL, EVENT_STATUSES } from "@/app/(site)/event/_lib/eventStatus";
import type { CafeEvent, CafeEventInput, EventStatus, EventTimeMode } from "@/app/(site)/event/_types";
import adminStyles from "../../_components/admin.module.css";
import { EVENT_LIMITS, type EventErrors } from "../_lib/validateEvent";
import styles from "./eventAdmin.module.css";

/** 버튼이 이동할 사이트 페이지 — 고르거나 직접 입력 */
const CTA_PAGES = [
  { href: "/race", label: "레이스 출전표 (/race)" },
  { href: "/menu", label: "메뉴판 (/menu)" },
  { href: "/seat", label: "좌석 예약 (/seat)" },
  { href: "/my#coupons", label: "내 쿠폰 (/my#coupons)" },
  { href: "/my", label: "마이페이지 (/my)" },
  { href: "/event", label: "이벤트 목록 (/event)" },
];
const CUSTOM = "__custom";

/**
 * 폼 입력값 — 날짜는 빈 문자열(= 없음)로, 참여 방법 · 유의 사항은 한 줄에 하나인 글로, 상태는 "AUTO"(날짜 기준) 포함으로 들고 있다가
 * 제출할 때 CafeEventInput 으로 바꾼다.
 */
interface Draft {
  title: string;
  period: string;
  startDate: string;
  endDate: string;
  status: EventStatus | "AUTO";
  visible: boolean;
  timeMode: EventTimeMode;
  time: string;
  description: string;
  steps: string;
  notes: string;
  ctaLabel: string;
  ctaHref: string;
}

function toDraft(event: CafeEvent | null): Draft {
  return {
    title: event?.title ?? "",
    period: event?.period ?? "기간 한정",
    startDate: event?.startDate ?? "",
    endDate: event?.endDate ?? "",
    status: event?.statusOverride ?? "AUTO",
    visible: event?.visible ?? false,
    timeMode: event?.timeMode ?? "NONE",
    time: event?.time ?? "",
    description: event?.description ?? "",
    steps: event?.steps.join("\n") ?? "",
    notes: event?.notes.join("\n") ?? "",
    ctaLabel: event?.ctaLabel ?? "",
    ctaHref: event?.ctaHref ?? "",
  };
}

const lines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);

function toInput(d: Draft): CafeEventInput {
  return {
    title: d.title,
    period: d.period,
    timeMode: d.timeMode,
    time: d.time,
    description: d.description,
    steps: lines(d.steps),
    notes: lines(d.notes),
    startDate: d.startDate || null,
    endDate: d.endDate || null,
    statusOverride: d.status === "AUTO" ? null : d.status,
    visible: d.visible,
    ctaLabel: d.ctaLabel,
    ctaHref: d.ctaHref,
  };
}

interface EventFormProps {
  initial: CafeEvent | null; // null = 등록
  today: string; // KST — "자동이면 지금 무엇인지" 안내
  raceTimes: string; // "12:30 · 18:00" — 경주 시간표 따라가기 안내
  errors: EventErrors;
  busy: boolean;
  onSubmit: (input: CafeEventInput) => void;
  onCancel: () => void;
}

/** 이벤트 등록/수정 폼 — 검증은 useEventEditor.save 가 하고 결과(errors)를 필드 옆에 보여 준다 */
export default function EventForm({ initial, today, raceTimes, errors, busy, onSubmit, onCancel }: EventFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [customHref, setCustomHref] = useState(() => Boolean(initial?.ctaHref) && !CTA_PAGES.some((p) => p.href === initial?.ctaHref));
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const errorCount = Object.keys(errors).length;
  const auto = autoStatus({ startDate: draft.startDate || null, endDate: draft.endDate || null }, today);

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
        <Field id={id("title")} label="이벤트 이름" required error={errors.title} hint="손님 화면에 크게 보여요 · 예: DAILY RACE">
          <input
            id={id("title")}
            className={adminStyles.input}
            value={draft.title}
            maxLength={EVENT_LIMITS.titleMax + 10}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
        </Field>

        <Field id={id("period")} label="운영 안내" required error={errors.period} hint="티켓 왼쪽 알약 · 예: 매일 · 상시 · 첫 방문">
          <input
            id={id("period")}
            className={adminStyles.input}
            value={draft.period}
            onChange={(e) => set("period", e.target.value)}
            aria-invalid={!!errors.period}
          />
        </Field>

        <DateField
          id={id("startDate")}
          label="시작일"
          value={draft.startDate}
          error={errors.startDate}
          emptyHint="비우면 이미 시작한 것으로 봐요"
          onChange={(v) => set("startDate", v)}
        />
        <DateField
          id={id("endDate")}
          label="종료일"
          value={draft.endDate}
          min={draft.startDate || undefined}
          error={errors.endDate}
          emptyHint="비우면 상시(종료일 없음) · 종료일 당일까지 진행 중"
          onChange={(v) => set("endDate", v)}
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
              ? "시작일 전이면 예정, 종료일이 지나면 종료로 저절로 바뀌어요."
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
          <legend className={adminStyles.label}>시각 표시</legend>
          <div className={adminStyles.radioRow}>
            <label className={adminStyles.radio}>
              <input type="radio" name={id("timeMode")} checked={draft.timeMode === "NONE"} onChange={() => set("timeMode", "NONE")} />
              없음
            </label>
            <label className={adminStyles.radio}>
              <input type="radio" name={id("timeMode")} checked={draft.timeMode === "TEXT"} onChange={() => set("timeMode", "TEXT")} />
              직접 입력
            </label>
            <label className={adminStyles.radio}>
              <input type="radio" name={id("timeMode")} checked={draft.timeMode === "RACE"} onChange={() => set("timeMode", "RACE")} />
              경주 시간표 따라가기 ({raceTimes})
            </label>
          </div>
          {draft.timeMode === "TEXT" && (
            <input
              className={`${adminStyles.input} ${styles.timeText}`}
              aria-label="시각 문구"
              value={draft.time}
              placeholder="평일 15:00"
              onChange={(e) => set("time", e.target.value)}
              aria-invalid={!!errors.time}
            />
          )}
          {errors.time ? (
            <span className={adminStyles.error}>{errors.time}</span>
          ) : (
            draft.timeMode === "RACE" && <span className={adminStyles.hint}>경주 관리에서 시간표를 바꾸면 함께 바뀌어요.</span>
          )}
        </fieldset>

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
          id={id("steps")}
          label="참여 방법"
          error={errors.steps}
          hint={`한 줄에 하나 · 최대 ${EVENT_LIMITS.itemsMax}줄 · 상세에 번호를 붙여 보여요`}
        >
          <textarea
            id={id("steps")}
            className={`${adminStyles.input} ${adminStyles.textarea} ${styles.listInput}`}
            rows={4}
            value={draft.steps}
            onChange={(e) => set("steps", e.target.value)}
            aria-invalid={!!errors.steps}
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

        <Field id={id("ctaLabel")} label="버튼 문구" error={errors.ctaLabel} hint="비우면 이동 버튼 없음 · 예: Race 참여하기">
          <input
            id={id("ctaLabel")}
            className={adminStyles.input}
            value={draft.ctaLabel}
            onChange={(e) => set("ctaLabel", e.target.value)}
            aria-invalid={!!errors.ctaLabel}
          />
        </Field>

        <Field id={id("ctaHref")} label="이동할 페이지" error={errors.ctaHref}>
          <select
            id={id("ctaHref")}
            className={adminStyles.input}
            value={customHref ? CUSTOM : draft.ctaHref}
            onChange={(e) => {
              const custom = e.target.value === CUSTOM;
              setCustomHref(custom);
              if (!custom) set("ctaHref", e.target.value);
            }}
            aria-invalid={!!errors.ctaHref}
          >
            <option value="">없음</option>
            {CTA_PAGES.map((p) => (
              <option key={p.href} value={p.href}>
                {p.label}
              </option>
            ))}
            <option value={CUSTOM}>직접 입력</option>
          </select>
          {customHref && (
            <input
              className={`${adminStyles.input} ${adminStyles.pathInput}`}
              aria-label="이동할 주소 직접 입력"
              value={draft.ctaHref}
              placeholder="/menu/3"
              onChange={(e) => set("ctaHref", e.target.value)}
            />
          )}
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
