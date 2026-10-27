"use client";

import { useState } from "react";
import {
  createEvent,
  deleteEvent,
  EventError,
  updateEvent,
  updateEventStatus,
  updateEventVisibility,
} from "@/app/(site)/event/_lib/eventService";
import { crowdedOf, EVENT_STATUS_LABEL, hasApplicants } from "@/app/(site)/event/_lib/eventStatus";
import { adminEventsStore, eventsStore } from "@/app/(site)/event/_lib/eventStore";
import type { CafeEvent, CafeEventInput, EventStatus } from "@/app/(site)/event/_types";
import { useToast } from "../../_components/AdminToast";
import { hasErrors, validateEvent, type EventErrors } from "../_lib/validateEvent";

export type EventEditing = { mode: "create" } | { mode: "edit"; event: CafeEvent } | null;

/** TEXT 칼럼 — 줄마다 앞뒤 공백 · 빈 줄을 지운다 */
const cleanText = (text: string) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");

const cleanPath = (path: string | null) => path?.trim() || null;

/** 쓰기 뒤 — 관리자 목록과 손님 화면 목록을 다시 불러온다 */
const refreshEvents = () => Promise.all([adminEventsStore.refresh(), eventsStore.refresh()]);

/** 서버가 거절한 이유 문구 — 연결 실패 등은 기본 문구 */
const messageOf = (e: unknown, fallback: string) => (e instanceof EventError ? e.message : fallback);

/**
 * 이벤트 쓰기 — 등록/수정 폼 · 삭제 확인 · 상태 지정 · 노출 허가 + 결과 알림. 목록(/admin/event)과 상세(/admin/event/[id])가 함께 쓴다.
 * 값은 관리자 API(eventService)로 저장하고 관리자 · 손님 목록 저장소를 다시 불러오므로 따로 목록 State 를 들지 않는다.
 * 신청자가 있는 이벤트는 지울 수 없어(백엔드 EVENT_HAS_APPLIES) 확인창 대신 안내를 띄운다.
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

  /** 저장 — 검증에 실패하면 errors 를 채우고 폼을 열어 둔다. 쿠폰 미지급 이벤트는 지급 쿠폰 수 · 선착순 인원을 비운다 */
  async function save(input: CafeEventInput) {
    if (!editing || busy) return;
    const editingId = editing.mode === "edit" ? editing.event.id : null;
    const errs = validateEvent(input, { events, editingId });
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    const clean: CafeEventInput = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      howTo: cleanText(input.howTo),
      notes: cleanText(input.notes),
      thumbnail: cleanPath(input.thumbnail),
      imageHero: cleanPath(input.imageHero),
      imageDetail: cleanPath(input.imageDetail),
      couponAmount: input.coupon ? input.couponAmount : null,
      capacity: input.coupon ? input.capacity : null,
    };
    setBusy(true);
    try {
      const saved = editingId === null ? await createEvent(clean) : await updateEvent(editingId, clean);
      await refreshEvents();
      show(`"${saved.title}" 이벤트를 ${editingId === null ? "등록" : "저장"}했어요.`);
      closeForm();
    } catch (e) {
      // 폼을 연 사이 손님이 신청한 경우 등 — 서버가 같은 규칙으로 한 번 더 막는다
      if (e instanceof EventError && e.code === "EVENT_COUPON_LOCKED") {
        setErrors({ coupon: "그사이 신청자가 생겨 쿠폰 지급 여부와 지급 쿠폰 수를 바꿀 수 없어요." });
      } else if (e instanceof EventError && e.code === "EVENT_CAPACITY_BELOW_APPLIES") {
        setErrors({ capacity: "그사이 참여 인원이 늘어 선착순 인원을 그보다 적게 줄일 수 없어요." });
      } else if (e instanceof EventError && e.code === "EVENT_TITLE_DUPLICATED") {
        setErrors({ title: "같은 이름의 이벤트가 이미 있어요." });
      } else {
        show(messageOf(e, "저장하지 못했어요. 잠시 후 다시 시도해 주세요."), "error");
      }
      void refreshEvents();
    } finally {
      setBusy(false);
    }
  }

  /** 삭제 버튼 — 신청자가 있으면 지울 수 없어 안내만 */
  function askDelete(event: CafeEvent) {
    if (hasApplicants(event)) {
      const count = event.coupon ? crowdedOf(event) : event.applyCount;
      show(`"${event.title}"은 신청자(${count}명)가 있어 삭제할 수 없어요. 상태를 종료로 지정해 내리세요.`, "error");
      return;
    }
    setDeleting(event);
  }

  /** 삭제 확인창의 [삭제] — 성공하면 true */
  async function confirmDelete(): Promise<boolean> {
    if (!deleting || busy) return false;
    const target = deleting;
    setBusy(true);
    try {
      await deleteEvent(target.id);
      await refreshEvents();
      setDeleting(null);
      show(`"${target.title}" 이벤트를 삭제했어요.`);
      return true;
    } catch (e) {
      setDeleting(null);
      show(
        e instanceof EventError && e.code === "EVENT_HAS_APPLIES"
          ? `"${target.title}"은 그사이 신청자가 생겨 삭제할 수 없어요.`
          : messageOf(e, "삭제하지 못했어요."),
        "error",
      );
      void refreshEvents();
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setVisible(event: CafeEvent, visible: boolean) {
    try {
      await updateEventVisibility(event.id, visible);
      await refreshEvents();
      show(`"${event.title}" 노출 허가를 ${visible ? "켰어요" : "껐어요"}.`);
    } catch (e) {
      show(messageOf(e, "노출 설정을 바꾸지 못했어요."), "error");
    }
  }

  async function setStatus(event: CafeEvent, status: EventStatus | null) {
    if (event.status === status) return;
    try {
      await updateEventStatus(event.id, status);
      await refreshEvents();
      show(
        status
          ? `"${event.title}" 상태를 '${EVENT_STATUS_LABEL[status]}'로 지정했어요.`
          : `"${event.title}" 상태를 날짜 기준 자동으로 되돌렸어요.`,
      );
    } catch (e) {
      show(messageOf(e, "상태를 바꾸지 못했어요."), "error");
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
    askDelete,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    setVisible,
    setStatus,
    toast,
    show,
  };
}
