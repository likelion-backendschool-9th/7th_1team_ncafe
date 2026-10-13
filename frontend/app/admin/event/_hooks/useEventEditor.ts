"use client";

import { useState } from "react";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  updateEventStatus,
  updateEventVisibility,
} from "@/app/(site)/event/_lib/eventService";
import { EVENT_STATUS_LABEL } from "@/app/(site)/event/_lib/eventStatus";
import type { CafeEvent, CafeEventInput, EventStatus } from "@/app/(site)/event/_types";
import { useToast } from "../../_components/AdminToast";
import { hasErrors, validateEvent, type EventErrors } from "../_lib/validateEvent";

export type EventEditing = { mode: "create" } | { mode: "edit"; event: CafeEvent } | null;

const cleanList = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

/**
 * 이벤트 쓰기 — 등록/수정 폼 · 삭제 확인 · 상태 지정 · 노출 허가 + 결과 알림. 목록(/admin/event)과 상세(/admin/event/[id])가 함께 쓴다.
 * 값은 eventService 가 저장소에 쓰고, 화면은 useEvents 로 구독하므로 따로 목록 State 를 들지 않는다.
 */
export function useEventEditor(events: readonly CafeEvent[]) {
  const [editing, setEditing] = useState<EventEditing>(null);
  const [errors, setErrors] = useState<EventErrors>({});
  const [deleting, setDeleting] = useState<CafeEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  function openCreate() {
    setErrors({});
    setEditing({ mode: "create" });
  }

  function openEdit(event: CafeEvent) {
    setErrors({});
    setEditing({ mode: "edit", event });
  }

  function closeForm() {
    setEditing(null);
    setErrors({});
  }

  /** 저장 — 검증에 실패하면 errors 를 채우고 폼을 열어 둔다 */
  async function save(input: CafeEventInput) {
    if (!editing || busy) return;
    const editingId = editing.mode === "edit" ? editing.event.id : null;
    const errs = validateEvent(input, { events, editingId });
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    const label = input.ctaLabel?.trim() ?? "";
    const href = input.ctaHref?.trim() ?? "";
    const clean: CafeEventInput = {
      ...input,
      title: input.title.trim(),
      period: input.period.trim(),
      time: input.timeMode === "TEXT" ? input.time.trim() : "",
      description: input.description.trim(),
      steps: cleanList(input.steps),
      notes: cleanList(input.notes),
      ctaLabel: label && href ? label : undefined,
      ctaHref: label && href ? href : undefined,
    };
    setBusy(true);
    try {
      const saved = editingId === null ? await createEvent(clean) : await updateEvent(editingId, clean);
      show(`"${saved.title}" 이벤트를 ${editingId === null ? "등록" : "저장"}했어요.`);
      closeForm();
    } catch {
      show("저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  /** 삭제 확인창의 [삭제] — 성공하면 true */
  async function confirmDelete(): Promise<boolean> {
    if (!deleting || busy) return false;
    const target = deleting;
    setBusy(true);
    try {
      await deleteEvent(target.id);
      setDeleting(null);
      show(`"${target.title}" 이벤트를 삭제했어요.`);
      return true;
    } catch {
      show("삭제하지 못했어요.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setVisible(event: CafeEvent, visible: boolean) {
    try {
      await updateEventVisibility(event.id, visible);
      show(`"${event.title}" 노출 허가를 ${visible ? "켰어요" : "껐어요"}.`);
    } catch {
      show("노출 설정을 바꾸지 못했어요.", "error");
    }
  }

  async function setStatus(event: CafeEvent, statusOverride: EventStatus | null) {
    if (event.statusOverride === statusOverride) return;
    try {
      await updateEventStatus(event.id, statusOverride);
      show(
        statusOverride
          ? `"${event.title}" 상태를 '${EVENT_STATUS_LABEL[statusOverride]}'로 지정했어요.`
          : `"${event.title}" 상태를 날짜 기준 자동으로 되돌렸어요.`,
      );
    } catch {
      show("상태를 바꾸지 못했어요.", "error");
    }
  }

  return {
    editing,
    errors,
    busy,
    openCreate,
    openEdit,
    closeForm,
    save,
    deleting,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    setVisible,
    setStatus,
    toast,
    show,
  };
}
