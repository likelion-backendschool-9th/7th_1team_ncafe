// 출전마 수정 폼 검증 — 순수 함수
import { HORSE_IMAGES, HORSE_TRAITS } from "@/app/(site)/race/_data/horses";
import type { Horse, HorseInput } from "@/app/(site)/race/_types";

export type HorseErrors = Partial<Record<keyof HorseInput, string>>;

export const HORSE_LIMITS = {
  nameMax: 12,
  nameKoMax: 8,
  colorNameMax: 6,
  personalityMax: 20,
  descriptionMax: 60,
};

interface Context {
  horses: Horse[]; // 지금 출전마(이름 중복 검사용)
  editingId: number;
}

export function validateHorse(input: HorseInput, { horses, editingId }: Context): HorseErrors {
  const errors: HorseErrors = {};
  const others = horses.filter((h) => h.id !== editingId);
  const name = input.name.trim();
  const nameKo = input.nameKo.trim();

  if (!name) errors.name = "영문 이름을 입력해 주세요.";
  else if (name.length > HORSE_LIMITS.nameMax) errors.name = `영문 이름은 ${HORSE_LIMITS.nameMax}자 이내로 입력해 주세요.`;
  else if (!/^[A-Za-z][A-Za-z ]*$/.test(name)) errors.name = "영문 이름은 영문자와 공백만 쓸 수 있어요.";
  else if (others.some((h) => h.name.trim().toLowerCase() === name.toLowerCase())) errors.name = "다른 말이 이미 쓰는 이름이에요.";

  if (!nameKo) errors.nameKo = "한글 이름을 입력해 주세요.";
  else if (nameKo.length > HORSE_LIMITS.nameKoMax) errors.nameKo = `한글 이름은 ${HORSE_LIMITS.nameKoMax}자 이내로 입력해 주세요.`;
  else if (others.some((h) => h.nameKo.trim() === nameKo)) errors.nameKo = "다른 말이 이미 쓰는 이름이에요.";

  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) errors.color = "조끼 색은 #RRGGBB 형식으로 입력해 주세요.";

  if (!input.colorName.trim()) errors.colorName = "색 이름을 입력해 주세요.";
  else if (input.colorName.trim().length > HORSE_LIMITS.colorNameMax)
    errors.colorName = `색 이름은 ${HORSE_LIMITS.colorNameMax}자 이내로 입력해 주세요.`;

  if (!HORSE_IMAGES.includes(input.image)) errors.image = "출전마 이미지 중에서 골라 주세요.";
  if (!HORSE_TRAITS.includes(input.trait)) errors.trait = "주행 성향을 골라 주세요.";

  if (!input.personality.trim()) errors.personality = "성격을 입력해 주세요.";
  else if (input.personality.trim().length > HORSE_LIMITS.personalityMax)
    errors.personality = `성격은 ${HORSE_LIMITS.personalityMax}자 이내로 입력해 주세요.`;

  if (!input.description.trim()) errors.description = "설명을 입력해 주세요.";
  else if (input.description.trim().length > HORSE_LIMITS.descriptionMax)
    errors.description = `설명은 ${HORSE_LIMITS.descriptionMax}자 이내로 입력해 주세요.`;

  return errors;
}

export function hasErrors(errors: HorseErrors): boolean {
  return Object.keys(errors).length > 0;
}
