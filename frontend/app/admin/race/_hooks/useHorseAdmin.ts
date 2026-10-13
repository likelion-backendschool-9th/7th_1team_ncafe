"use client";

import { useState } from "react";
import { updateHorse } from "@/app/(site)/race/_lib/raceService";
import type { Horse, HorseInput } from "@/app/(site)/race/_types";
import type { ToastMessage } from "../../_components/AdminToast";
import { hasErrors, validateHorse, type HorseErrors } from "../_lib/validateHorse";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

/** 출전마 수정 — 폼 열기/닫기 · 검증 · 저장(raceService.updateHorse). 목록은 useRaceHorses 가 저장소를 구독해 바로 바뀐다 */
export function useHorseAdmin(horses: Horse[], show: Show) {
  const [editing, setEditing] = useState<Horse | null>(null);
  const [errors, setErrors] = useState<HorseErrors>({});
  const [busy, setBusy] = useState(false);

  function open(horse: Horse) {
    setErrors({});
    setEditing(horse);
  }

  function close() {
    setEditing(null);
    setErrors({});
  }

  async function save(input: HorseInput) {
    if (!editing || busy) return;
    const errs = validateHorse(input, { horses, editingId: editing.id });
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    const clean: HorseInput = {
      ...input,
      name: input.name.trim(),
      nameKo: input.nameKo.trim(),
      colorName: input.colorName.trim(),
      color: input.color.toLowerCase(),
      personality: input.personality.trim(),
      description: input.description.trim(),
    };
    const traitChanged = clean.trait !== editing.trait;
    setBusy(true);
    try {
      const { horse } = await updateHorse(editing.id, clean);
      close();
      show(`${horse.name.toUpperCase()} 정보를 저장했어요.${traitChanged ? " 주행 성향은 다음 경주부터 반영돼요." : ""}`);
    } catch {
      show("저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  return { editing, errors, busy, open, close, save };
}
