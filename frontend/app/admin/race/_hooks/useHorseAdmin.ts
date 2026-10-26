"use client";

import { useState } from "react";
import { updateHorse } from "@/app/(site)/race/_lib/raceService";
import { horsesStore } from "@/app/(site)/race/_lib/raceStores";
import type { Horse, HorseInput } from "@/app/(site)/race/_types";
import { ApiError } from "@/lib/api";
import { raceScheduleStore } from "@/lib/raceSchedule";
import type { ToastMessage } from "../../_components/AdminToast";
import { hasErrors, validateHorse, type HorseErrors } from "../_lib/validateHorse";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

/**
 * 출전마 수정 — 폼 열기/닫기 · 검증 · 저장(PUT /api/v1/admin/horses/{id}). 저장 뒤 출전마 · 일정(성향 사본)을 다시 불러와
 * 이 화면과 손님 화면이 함께 바뀐다. 같은 규칙을 먼저 검사하고, 서버가 거절하면 그 문구를 보여 준다.
 */
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
      const horse = await updateHorse(editing.id, clean);
      await Promise.all([horsesStore.refresh(), raceScheduleStore.refresh()]);
      close();
      show(`${horse.name.toUpperCase()} 정보를 저장했어요.${traitChanged ? " 주행 성향은 아직 마감 전인 경주부터 반영돼요." : ""}`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  return { editing, errors, busy, open, close, save };
}
