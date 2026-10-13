// 이벤트 등록/수정 폼 검증 — 순수 함수
import type { CafeEvent, CafeEventInput } from "@/app/(site)/event/_types";

export type EventErrors = Partial<Record<keyof CafeEventInput, string>>;

export const EVENT_LIMITS = {
  titleMax: 30,
  periodMax: 10,
  timeMax: 20,
  descriptionMax: 120,
  itemsMax: 6, // 참여 방법 · 유의 사항 줄 수
  itemMax: 80, // 한 줄 글자 수
  ctaLabelMax: 14,
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** 실제로 있는 날짜인가("2026-02-30" 거름) */
function isValidYmd(value: string): boolean {
  if (!YMD.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function listError(items: string[], label: string): string | undefined {
  if (items.length > EVENT_LIMITS.itemsMax) return `${label}은 ${EVENT_LIMITS.itemsMax}줄까지 쓸 수 있어요.`;
  const long = items.findIndex((s) => s.length > EVENT_LIMITS.itemMax);
  if (long >= 0) return `${label} ${long + 1}번째 줄이 ${EVENT_LIMITS.itemMax}자를 넘어요.`;
  return undefined;
}

interface Context {
  events: readonly CafeEvent[]; // 지금 목록(제목 중복 검사용)
  editingId: number | null; // 수정 중인 이벤트 id, 등록이면 null
}

export function validateEvent(input: CafeEventInput, { events, editingId }: Context): EventErrors {
  const errors: EventErrors = {};
  const title = input.title.trim();

  if (!title) errors.title = "이벤트 이름을 입력해 주세요.";
  else if (title.length > EVENT_LIMITS.titleMax) errors.title = `이벤트 이름은 ${EVENT_LIMITS.titleMax}자 이내로 입력해 주세요.`;
  else if (events.some((e) => e.id !== editingId && e.title.trim().toLowerCase() === title.toLowerCase()))
    errors.title = "같은 이름의 이벤트가 이미 있어요.";

  if (!input.period.trim()) errors.period = "운영 안내를 입력해 주세요(예: 매일 · 상시 · 기간 한정).";
  else if (input.period.trim().length > EVENT_LIMITS.periodMax)
    errors.period = `운영 안내는 ${EVENT_LIMITS.periodMax}자 이내로 짧게 입력해 주세요.`;

  if (input.startDate !== null && !isValidYmd(input.startDate)) errors.startDate = "시작일을 다시 골라 주세요.";
  if (input.endDate !== null && !isValidYmd(input.endDate)) errors.endDate = "종료일을 다시 골라 주세요.";
  else if (input.startDate && input.endDate && input.endDate < input.startDate)
    errors.endDate = "종료일은 시작일과 같거나 뒤여야 해요.";

  if (input.timeMode === "TEXT") {
    if (!input.time.trim()) errors.time = "시각 문구를 입력해 주세요(예: 평일 15:00).";
    else if (input.time.trim().length > EVENT_LIMITS.timeMax) errors.time = `시각 문구는 ${EVENT_LIMITS.timeMax}자 이내로 입력해 주세요.`;
  }

  if (!input.description.trim()) errors.description = "설명을 입력해 주세요.";
  else if (input.description.trim().length > EVENT_LIMITS.descriptionMax)
    errors.description = `설명은 ${EVENT_LIMITS.descriptionMax}자 이내로 입력해 주세요.`;

  const stepsError = listError(input.steps, "참여 방법");
  if (stepsError) errors.steps = stepsError;
  const notesError = listError(input.notes, "유의 사항");
  if (notesError) errors.notes = notesError;

  const label = input.ctaLabel?.trim() ?? "";
  const href = input.ctaHref?.trim() ?? "";
  if (label && !href) errors.ctaHref = "버튼이 이동할 페이지를 골라 주세요.";
  else if (!label && href) errors.ctaLabel = "버튼 문구를 입력해 주세요.";
  else if (label.length > EVENT_LIMITS.ctaLabelMax) errors.ctaLabel = `버튼 문구는 ${EVENT_LIMITS.ctaLabelMax}자 이내로 입력해 주세요.`;
  else if (href && !href.startsWith("/")) errors.ctaHref = "사이트 안의 주소(/ 로 시작)만 쓸 수 있어요.";

  return errors;
}

export function hasErrors(errors: EventErrors): boolean {
  return Object.keys(errors).length > 0;
}
