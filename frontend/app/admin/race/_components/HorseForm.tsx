"use client";

import Image from "next/image";
import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import { defaultHorse, HORSE_IMAGES, HORSE_TRAITS } from "@/app/(site)/race/_data/horses";
import { TRAIT_LABEL } from "@/app/(site)/race/_lib/records";
import type { Horse, HorseInput, HorseTrait } from "@/app/(site)/race/_types";
import adminStyles from "../../_components/admin.module.css";
import { HORSE_LIMITS, type HorseErrors } from "../_lib/validateHorse";
import styles from "./raceAdmin.module.css";

/** 성향이 경주에서 어떻게 달리는지 — 시뮬레이션(_lib/simulation.ts)의 구간 배율 · 이벤트 확률을 말로 */
const TRAIT_HINT: Record<HorseTrait, string> = {
  FAST_START: "초반에 빠르고 막판에 조금 느려져요",
  STEADY: "구간마다 고르고 돌발 상황이 적어요",
  LATE_SPURT: "초반엔 느리지만 막판 스퍼트를 꼭 써요",
  WILDCARD: "돌발 상황이 잦고 속도 변화가 커요",
  BALANCED: "어느 구간에서도 무난해요",
};

const imageLabel = (path: string) => path.split("/").pop()?.replace(".png", "") ?? path;

interface HorseFormProps {
  horse: Horse;
  errors: HorseErrors;
  busy: boolean;
  onSubmit: (input: HorseInput) => void;
  onCancel: () => void;
}

const toDraft = (h: Horse): HorseInput => ({
  name: h.name,
  nameKo: h.nameKo,
  color: h.color,
  colorName: h.colorName,
  image: h.image,
  personality: h.personality,
  trait: h.trait,
  description: h.description,
});

/** 출전마 수정 폼 — 검증은 useHorseAdmin.save 가 하고 결과(errors)를 필드 옆에 보여 준다. 말 id(7마리 구성)는 바꾸지 않는다 */
export default function HorseForm({ horse, errors, busy, onSubmit, onCancel }: HorseFormProps) {
  const [draft, setDraft] = useState<HorseInput>(() => toDraft(horse));
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof HorseInput>(key: K, value: HorseInput[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const original = defaultHorse(horse.id);
  const errorCount = Object.keys(errors).length;

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(draft);
  }

  return (
    <form className={adminStyles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={adminStyles.dialogTitle}>출전마 수정 — {horse.name.toUpperCase()}</h2>

      {errorCount > 0 && (
        <p className={adminStyles.formAlert} role="alert">
          입력값을 확인해 주세요. ({errorCount}개 항목)
        </p>
      )}

      <div className={adminStyles.formGrid}>
        <Field id={id("name")} label="영문 이름" required error={errors.name} hint="화면에는 대문자로 보여요">
          <input
            id={id("name")}
            className={adminStyles.input}
            value={draft.name}
            maxLength={HORSE_LIMITS.nameMax + 4}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
        </Field>

        <Field id={id("nameKo")} label="한글 이름" required error={errors.nameKo}>
          <input
            id={id("nameKo")}
            className={adminStyles.input}
            value={draft.nameKo}
            onChange={(e) => set("nameKo", e.target.value)}
            aria-invalid={!!errors.nameKo}
          />
        </Field>

        <Field id={id("color")} label="조끼 색" required error={errors.color} hint="번호 배지 · 트랙 표식에 쓰여요">
          <div className={styles.colorRow}>
            <input
              type="color"
              className={styles.colorPicker}
              value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : "#000000"}
              onChange={(e) => set("color", e.target.value)}
              aria-label="조끼 색 고르기"
            />
            <input
              id={id("color")}
              className={`${adminStyles.input} ${adminStyles.pathInput}`}
              value={draft.color}
              onChange={(e) => set("color", e.target.value)}
              aria-invalid={!!errors.color}
              placeholder="#22633c"
            />
          </div>
        </Field>

        <Field id={id("colorName")} label="색 이름" required error={errors.colorName} hint="출전표 '모카 · 초록 조끼'">
          <input
            id={id("colorName")}
            className={adminStyles.input}
            value={draft.colorName}
            onChange={(e) => set("colorName", e.target.value)}
            aria-invalid={!!errors.colorName}
          />
        </Field>

        <fieldset className={`${adminStyles.field} ${adminStyles.fieldWide}`}>
          <legend className={adminStyles.label}>이미지</legend>
          <div className={styles.imageOptions}>
            {HORSE_IMAGES.map((path) => (
              <label key={path} className={styles.imageOption}>
                <input
                  type="radio"
                  name={id("image")}
                  checked={draft.image === path}
                  onChange={() => set("image", path)}
                />
                <Image src={path} alt="" width={72} height={52} />
                {imageLabel(path)}
              </label>
            ))}
          </div>
          {errors.image && <span className={adminStyles.error}>{errors.image}</span>}
        </fieldset>

        <fieldset className={`${adminStyles.field} ${adminStyles.fieldWide}`}>
          <legend className={adminStyles.label}>주행 성향</legend>
          <div className={styles.traitOptions}>
            {HORSE_TRAITS.map((trait) => (
              <label key={trait} className={styles.traitOption}>
                <input type="radio" name={id("trait")} checked={draft.trait === trait} onChange={() => set("trait", trait)} />
                <span className={styles.traitText}>
                  <strong>{TRAIT_LABEL[trait]}</strong>
                  {TRAIT_HINT[trait]}
                </span>
              </label>
            ))}
          </div>
          {errors.trait && <span className={adminStyles.error}>{errors.trait}</span>}
          {draft.trait !== horse.trait && (
            <p className={styles.formNote}>
              주행 성향은 경주 결과를 바꿔요. 저장하면 <strong>다음 경주부터</strong> 반영되고, 이미 끝난 경주의 결과는 그대로예요.
            </p>
          )}
        </fieldset>

        <Field
          id={id("personality")}
          label="성격"
          required
          error={errors.personality}
          hint={`${draft.personality.trim().length} / ${HORSE_LIMITS.personalityMax}자`}
          wide
        >
          <input
            id={id("personality")}
            className={adminStyles.input}
            value={draft.personality}
            onChange={(e) => set("personality", e.target.value)}
            aria-invalid={!!errors.personality}
          />
        </Field>

        <Field
          id={id("description")}
          label="설명"
          required
          error={errors.description}
          hint={`${draft.description.trim().length} / ${HORSE_LIMITS.descriptionMax}자 · 출전표 카드 아래 한 줄`}
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
      </div>

      <div className={styles.formFoot}>
        {original ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(toDraft(original))}>
            기본값으로 채우기
          </button>
        ) : (
          <span />
        )}
        <div className={adminStyles.dialogActions}>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="btn btn-gold" disabled={busy}>
            저장
          </button>
        </div>
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
