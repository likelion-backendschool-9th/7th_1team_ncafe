// 이벤트 등록/수정 폼 검증 — 순수 함수. 서버(service.admin.EventService)가 같은 규칙으로 다시 검사한다(지점 목록은 화면만 검사).
import { crowdedOf, hasApplicants } from "@/app/(site)/event/_lib/eventStatus";
import { BRANCHES } from "@/app/(site)/seat/_data/branches";
import type { CafeEvent, CafeEventInput } from "@/app/(site)/event/_types";

export type EventErrors = Partial<Record<keyof CafeEventInput, string>>;

export const EVENT_LIMITS = {
  titleMax: 30,
  descriptionMax: 120,
  itemsMax: 6, // 참여 방법 · 유의 사항 줄 수
  itemMax: 80, // 한 줄 글자 수
  couponMax: 99, // 한 명에게 주는 쿠폰 수
  capacityMax: 9999, // 선착순 인원
  pathMax: 255, // 이미지 경로 VARCHAR(255)
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** 실제로 있는 날짜인가("2026-02-30" 거름) */
function isValidYmd(value: string): boolean {
  if (!YMD.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** TEXT 칼럼(한 줄에 하나) 검사 */
function linesError(text: string, label: string): string | undefined {
  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length > EVENT_LIMITS.itemsMax) return `${label}은 ${EVENT_LIMITS.itemsMax}줄까지 쓸 수 있어요.`;
  const long = items.findIndex((s) => s.length > EVENT_LIMITS.itemMax);
  if (long >= 0) return `${label} ${long + 1}번째 줄이 ${EVENT_LIMITS.itemMax}자를 넘어요.`;
  return undefined;
}

/** 이미지 경로 — 비우거나 사이트 안 경로("/events/...")만 */
function pathError(path: string | null): string | undefined {
  if (path === null) return undefined;
  if (!path.startsWith("/") || path.startsWith("//")) return "사이트 안의 경로(/ 로 시작)만 쓸 수 있어요. 예: /events/first-gate.png";
  if (path.length > EVENT_LIMITS.pathMax) return `경로는 ${EVENT_LIMITS.pathMax}자 이내로 입력해 주세요.`;
  return undefined;
}

const isCount = (n: number | null, max: number) => n !== null && Number.isInteger(n) && n >= 1 && n <= max;

interface Context {
  events: readonly CafeEvent[]; // 지금 목록(제목 중복 검사 · 수정 중인 이벤트의 참여 인원)
  editingId: number | null; // 수정 중인 이벤트 id, 등록이면 null
}

export function validateEvent(input: CafeEventInput, { events, editingId }: Context): EventErrors {
  const errors: EventErrors = {};
  const current = editingId === null ? null : (events.find((e) => e.id === editingId) ?? null);
  const crowded = current ? crowdedOf(current) : 0;
  const title = input.title.trim();

  if (!BRANCHES.some((b) => b.id === input.branchId)) errors.branchId = "이벤트를 작성한 지점을 골라 주세요.";

  if (!title) errors.title = "이벤트 이름을 입력해 주세요.";
  else if (title.length > EVENT_LIMITS.titleMax) errors.title = `이벤트 이름은 ${EVENT_LIMITS.titleMax}자 이내로 입력해 주세요.`;
  else if (events.some((e) => e.id !== editingId && e.title.trim().toLowerCase() === title.toLowerCase()))
    errors.title = "같은 이름의 이벤트가 이미 있어요.";

  if (input.dateStart !== null && !isValidYmd(input.dateStart)) errors.dateStart = "시작일을 다시 골라 주세요.";
  if (input.dateEnd !== null && !isValidYmd(input.dateEnd)) errors.dateEnd = "종료일을 다시 골라 주세요.";
  else if (input.dateStart && input.dateEnd && input.dateEnd < input.dateStart) errors.dateEnd = "종료일은 시작일과 같거나 뒤여야 해요.";

  // 신청자가 생긴 뒤에는 쿠폰 지급 여부 · 지급 쿠폰 수를 바꿀 수 없다(사용자 결정 2026-10-27) — 폼이 잠그지만 한 번 더 막는다
  if (current && hasApplicants(current) && (input.coupon !== current.coupon || input.couponAmount !== current.couponAmount)) {
    errors.coupon = "신청자가 있어 쿠폰 지급 여부와 지급 쿠폰 수를 바꿀 수 없어요.";
  }
  if (input.coupon) {
    if (!isCount(input.couponAmount, EVENT_LIMITS.couponMax))
      errors.couponAmount = `지급 쿠폰 수는 1~${EVENT_LIMITS.couponMax}장으로 입력해 주세요.`;
    if (!isCount(input.capacity, EVENT_LIMITS.capacityMax))
      errors.capacity = `선착순 인원은 1~${EVENT_LIMITS.capacityMax}명으로 입력해 주세요.`;
    else if (input.capacity! < crowded) errors.capacity = `이미 ${crowded}명이 참여해서 그보다 적게 줄일 수 없어요.`;
  }

  if (!input.description.trim()) errors.description = "설명을 입력해 주세요.";
  else if (input.description.trim().length > EVENT_LIMITS.descriptionMax)
    errors.description = `설명은 ${EVENT_LIMITS.descriptionMax}자 이내로 입력해 주세요.`;

  const howToError = linesError(input.howTo, "참여 방법");
  if (howToError) errors.howTo = howToError;
  const notesError = linesError(input.notes, "유의 사항");
  if (notesError) errors.notes = notesError;

  const thumbnailError = pathError(input.thumbnail);
  if (thumbnailError) errors.thumbnail = thumbnailError;
  const heroError = pathError(input.imageHero);
  if (heroError) errors.imageHero = heroError;
  const detailError = pathError(input.imageDetail);
  if (detailError) errors.imageDetail = detailError;

  return errors;
}

export function hasErrors(errors: EventErrors): boolean {
  return Object.keys(errors).length > 0;
}
