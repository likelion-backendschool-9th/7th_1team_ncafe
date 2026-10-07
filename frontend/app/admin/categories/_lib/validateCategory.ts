// 카테고리 추가/수정 폼 검증 — 순수 함수
import type { Category, CategoryInput } from "@/app/(site)/menu/_types";

export type CategoryErrors = Partial<Record<keyof CategoryInput, string>>;

export const CATEGORY_LIMITS = { nameMax: 20, engNameMax: 30 };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function validateCategory(
  input: CategoryInput,
  { categories, editingId }: { categories: Category[]; editingId: number | null },
): CategoryErrors {
  const errors: CategoryErrors = {};
  const others = categories.filter((c) => c.id !== editingId);
  const name = input.name.trim();
  const engName = input.engName.trim();

  if (!name) errors.name = "카테고리 이름을 입력해 주세요.";
  else if (name.length > CATEGORY_LIMITS.nameMax) errors.name = `이름은 ${CATEGORY_LIMITS.nameMax}자 이내로 입력해 주세요.`;
  else if (others.some((c) => norm(c.name) === norm(name))) errors.name = "같은 이름의 카테고리가 이미 있습니다.";

  if (!engName) errors.engName = "영문명을 입력해 주세요.";
  else if (engName.length > CATEGORY_LIMITS.engNameMax) errors.engName = `영문명은 ${CATEGORY_LIMITS.engNameMax}자 이내로 입력해 주세요.`;
  else if (!/^[A-Za-z0-9 &'-]+$/.test(engName)) errors.engName = "영문명은 영문·숫자·공백만 사용할 수 있습니다.";
  else if (others.some((c) => norm(c.engName) === norm(engName))) errors.engName = "같은 영문명의 카테고리가 이미 있습니다.";

  return errors;
}
