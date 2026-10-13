"use client";

import { useState } from "react";
import { updateRaceTimes } from "@/app/(site)/race/_lib/raceService";
import { BASE_RACE_TIMES, isRaceTime, normalizeRaceTimes } from "@/lib/raceSchedule";
import { useRaceTimes } from "@/lib/useRaceTimes";
import type { ToastMessage } from "../../_components/AdminToast";
import { validateRaceTimes } from "../_lib/validateSchedule";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((t, i) => t === b[i]);

/**
 * 경주 시간표 편집 — 저장 전까지는 고친 목록(draft)을 따로 들고 있고, 저장하면 raceService.updateRaceTimes 로 바로 적용한다.
 * 고치지 않는 동안에는 지금 시간표(다른 탭에서 바뀌면 따라간다)를 보여 준다.
 */
export function useScheduleEditor(show: Show) {
  const current = useRaceTimes();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const times = draft ?? current;
  const dirty = draft !== null && !same(draft, current);
  const added = times.filter((t) => !current.includes(t));
  const removed = current.filter((t) => !times.includes(t));

  /** 시각 하나 추가 — 형식 · 중복만 바로 보고, 간격 등은 저장할 때 검사한다 */
  function add(time: string): boolean {
    if (!isRaceTime(time)) {
      setError("추가할 시각을 HH:MM 으로 골라 주세요.");
      return false;
    }
    if (times.includes(time)) {
      setError(`${time} 은 이미 시간표에 있어요.`);
      return false;
    }
    setDraft(normalizeRaceTimes([...times, time]));
    setError("");
    return true;
  }

  function remove(time: string) {
    setDraft(times.filter((t) => t !== time));
    setError("");
  }

  function cancel() {
    setDraft(null);
    setError("");
  }

  function fillDefault() {
    setDraft([...BASE_RACE_TIMES]);
    setError("");
  }

  async function save() {
    if (!dirty || busy) return;
    const problem = validateRaceTimes(times, Date.now());
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const version = await updateRaceTimes([...times]);
      setDraft(null);
      setError("");
      show(
        version.from > Date.now()
          ? "시간표를 저장했어요. 곧 출발하는 경주가 끝난 뒤부터 적용돼요."
          : "시간표를 저장했어요. 지금부터 적용돼요.",
      );
    } catch {
      show("시간표를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  return {
    current,
    times,
    dirty,
    added,
    removed,
    error,
    busy,
    isDefault: same(times, BASE_RACE_TIMES),
    add,
    remove,
    cancel,
    fillDefault,
    save,
  };
}
