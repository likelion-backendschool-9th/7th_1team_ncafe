"use client";

import { useState } from "react";
import { createRace, deleteRace } from "@/app/(site)/race/_lib/raceService";
import { adminRacesStore } from "@/app/(site)/race/_lib/raceStores";
import type { ServerRace } from "@/app/(site)/race/_types";
import { ApiError } from "@/lib/api";
import { kstEpoch } from "@/lib/kst";
import { raceScheduleStore } from "@/lib/raceSchedule";
import { formatRaceDate } from "@/lib/time";
import type { ToastMessage } from "../../_components/AdminToast";
import { shiftMonth } from "../_lib/timetable";
import { deleteBlockReason, isRaceTime, validateNewRace } from "../_lib/validateSchedule";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

const label = (at: number) => formatRaceDate(new Date(at).toISOString());

/** 서버가 거절한 이유(검증 · 충돌)면 그 문구, 아니면 null — 연결 실패 · 권한 문제는 토스트로 */
function rejection(e: unknown): string | null {
  return e instanceof ApiError && (e.status === 400 || e.status === 404 || e.status === 409) ? e.message : null;
}

/** 경주 추가 · 삭제 뒤 관리자 목록과 손님 화면 일정을 바로 다시 불러온다 */
async function refreshRaces() {
  await Promise.all([adminRacesStore.refresh(), raceScheduleStore.refresh()]);
}

/**
 * 경주 일정 달력(사용자 결정 2026-10-27) — 보는 달 · 고른 날짜 · 추가할 시각 · 삭제 확인을 들고 있고,
 * 추가 · 삭제는 관리자 API 로 저장한다(POST · DELETE /api/v1/admin/races). 고른 날짜는 처음엔 오늘(KST).
 * 같은 규칙을 먼저 검사하고, 쿠폰이 걸린 경주처럼 서버만 아는 이유는 서버 문구를 그대로 보여 준다.
 */
export function useRaceCalendar(today: string, races: ServerRace[], show: Show) {
  const [picked, setPicked] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null); // "YYYY-MM", null = 고른 날짜의 달
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null); // 삭제 확인창을 띄운 경주의 출발 시각

  const date = picked ?? today;
  const shownMonth = month ?? date.slice(0, 7);
  const starts = races.map((r) => r.startsAt).sort((a, b) => a - b);

  function pick(next: string) {
    setPicked(next);
    setError("");
  }

  function moveMonth(delta: number) {
    setMonth(shiftMonth(shownMonth, delta));
  }

  function goToday() {
    setPicked(null);
    setMonth(null);
    setError("");
  }

  function changeTime(value: string) {
    setTime(value);
    setError("");
  }

  /** 고른 날짜 + 시각으로 경주 추가 — 검사는 누르는 순간의 시각으로 한다 */
  async function add() {
    if (busy) return;
    if (!isRaceTime(time)) {
      setError("추가할 출발 시각을 골라 주세요.");
      return;
    }
    const at = kstEpoch(date, time);
    const problem = validateNewRace(at, starts, Date.now());
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const race = await createRace(at);
      await refreshRaces();
      setTime("");
      setError("");
      show(`${label(at)} Race #${race.raceNo} 경주를 추가했어요.`);
    } catch (e) {
      const reason = rejection(e);
      if (reason) setError(reason);
      else show(e instanceof ApiError ? e.message : "경주를 추가하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  /** 확인창의 [삭제] — 확인창을 띄운 사이 출발 1분 전이 됐을 수 있어 다시 검사한다. 번호는 지금 목록에서 다시 찾는다 */
  async function confirmDelete() {
    if (deleting === null || busy) return;
    const at = deleting;
    const race = races.find((r) => r.startsAt === at);
    const blocked = race ? deleteBlockReason(at, Date.now()) : "이미 삭제된 경주예요.";
    if (!race || blocked) {
      setDeleting(null);
      if (blocked) show(blocked, "error");
      return;
    }
    setBusy(true);
    try {
      await deleteRace(race.raceNo);
      await refreshRaces();
      show(`${label(at)} 경주를 삭제했어요.`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "경주를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return {
    starts,
    date,
    month: shownMonth,
    time,
    error,
    busy,
    deleting,
    pick,
    moveMonth,
    goToday,
    changeTime,
    add,
    askDelete: (at: number) => setDeleting(at),
    cancelDelete: () => setDeleting(null),
    confirmDelete,
  };
}
