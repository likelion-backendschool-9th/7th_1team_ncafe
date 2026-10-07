// 메뉴 등록/수정 폼 검증 — 순수 함수
import type { Category, Menu, MenuInput } from "@/app/(site)/menu/_types";

export type MenuErrors = Partial<Record<keyof MenuInput, string>>;

export const MENU_LIMITS = {
  nameMax: 30,
  engNameMax: 40,
  descriptionMax: 100,
  priceMax: 100_000,
  priceStep: 100,
};

interface Context {
  menus: Menu[]; // 현재 메뉴 목록(WINNER 중복 검사용)
  categories: Category[];
  editingId: number | null; // 수정 중인 메뉴 id, 등록이면 null
}

export function validateMenu(input: MenuInput, { menus, categories, editingId }: Context): MenuErrors {
  const errors: MenuErrors = {};
  const name = input.name.trim();
  const engName = input.engName.trim();

  if (!name) errors.name = "메뉴 이름을 입력해 주세요.";
  else if (name.length > MENU_LIMITS.nameMax) errors.name = `메뉴 이름은 ${MENU_LIMITS.nameMax}자 이내로 입력해 주세요.`;
  else if (menus.some((m) => m.id !== editingId && m.name.trim() === name)) errors.name = "같은 이름의 메뉴가 이미 있습니다.";

  if (!engName) errors.engName = "영문명을 입력해 주세요.";
  else if (engName.length > MENU_LIMITS.engNameMax) errors.engName = `영문명은 ${MENU_LIMITS.engNameMax}자 이내로 입력해 주세요.`;
  else if (!/^[A-Za-z0-9 '&.-]+$/.test(engName)) errors.engName = "영문명은 영문·숫자·공백만 사용할 수 있습니다.";

  if (!Number.isFinite(input.price)) errors.price = "가격을 숫자로 입력해 주세요.";
  else if (!Number.isInteger(input.price) || input.price < 0) errors.price = "가격은 0 이상의 정수여야 합니다.";
  else if (input.price % MENU_LIMITS.priceStep !== 0) errors.price = `가격은 ${MENU_LIMITS.priceStep}원 단위로 입력해 주세요.`;
  else if (input.price > MENU_LIMITS.priceMax) errors.price = `가격은 ${MENU_LIMITS.priceMax.toLocaleString("ko-KR")}원 이하로 입력해 주세요.`;

  if (!categories.some((c) => c.id === input.categoryId)) errors.categoryId = "카테고리를 선택해 주세요.";

  if (input.description.trim().length > MENU_LIMITS.descriptionMax)
    errors.description = `설명은 ${MENU_LIMITS.descriptionMax}자 이내로 입력해 주세요.`;

  if (!input.image.trim()) errors.image = "이미지를 선택해 주세요.";
  else if (!input.image.startsWith("/")) errors.image = "이미지 경로는 / 로 시작해야 합니다.";

  if (input.badge === "WINNER") {
    const other = menus.find((m) => m.id !== editingId && m.badge === "WINNER");
    if (other) errors.badge = `WINNER 배지는 한 메뉴에만 붙일 수 있습니다. 현재 "${other.name}"에 있습니다.`;
  }

  return errors;
}

export function hasErrors(errors: MenuErrors): boolean {
  return Object.keys(errors).length > 0;
}
