"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { addDays, kstDate } from "@/lib/kst";
import type { SeatReservation } from "@/types/common";
import { blockState, bookingRange, hasOpenBlock, sameSlot } from "../_lib/schedule";
import { getChairStatuses, getSlotAvailability, joinWaitlist as joinWaitlistService, reserveChairs } from "../_lib/seatService";
import { summarize, type SeatSummaryData } from "../_lib/summary";
import type { Branch, Chair, ChairStatusMap, Seat, SeatSlot, SlotAvailability, TimeBlock } from "../_types";
import { useMinuteClock } from "./useMinuteClock";

/** SCHEDULE: 일정 선택(날짜 · 지점 · 인원 · 시간대) → SEATS: 배치도에서 의자 고르기 → DONE: 예약 완료 */
export type BookingStep = "SCHEDULE" | "SEATS" | "DONE";

interface Options {
  seats: Seat[];
  chairs: Chair[];
  branches: Branch[];
  timeBlocks: TimeBlock[];
}

/** 안내 문구가 떠 있는 시간 */
const HINT_MS = 2600;

const EMPTY: string[] = [];

interface StatusSnapshot {
  key: string; // 지점|날짜|시작 시각
  map: ChairStatusMap;
  fetchedAt: number;
}

interface AvailabilitySnapshot {
  key: string; // 지점|날짜
  list: SlotAvailability[];
}

/**
 * /seat 예약 흐름의 단일 State — BLUEPRINT 8.3.
 * 좌석 상태의 단일 소스는 "서버가 준 시간대 상태 + 같은 시간대의 내 예약(UserProvider)"이고,
 * 요약 · 범례 · 시간대 잔여석 · 배치도는 모두 여기서 파생한다(별도 카운트 State 없음).
 * 서버 상태 · 잔여석은 내 예약까지 찬 자리로 센다 — 내 예약은 배치도에 "내 예약"으로 겹쳐 그리기만 한다.
 * 예약 · 예약대기를 하거나 자리를 뺏기면 서버 상태를 다시 받는다(reloadKey). /my 에서 취소해도 돌아오면 자리가 풀려 있다.
 */
export function useSeatBooking({ seats, chairs, branches, timeBlocks }: Options) {
  const { seatReservations, refreshSeatReservations } = useUser();
  const now = useMinuteClock();
  const today = now === null ? null : kstDate(now);
  const range = now === null ? null : bookingRange(now);

  const [rawStep, setStep] = useState<BookingStep>("SCHEDULE");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [people, setPeople] = useState<number | null>(null);
  const [pickedBlock, setBlock] = useState<TimeBlock | null>(null);
  const [rawSelected, setSelected] = useState<string[]>([]);
  const [hint, setHint] = useState<{ id: number; text: string } | null>(null);
  const [reservation, setReservation] = useState<SeatReservation | null>(null);
  const [busy, setBusy] = useState(false);
  // 올리면 시간대 상태 · 잔여석을 서버에서 다시 받는다 — 예약 · 예약대기 뒤, 다른 사람이 먼저 잡은 자리를 고른 뒤
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 고른 의자는 클릭 결과를 바로 돌려줘야 하므로(인원 초과 안내) 최신 값을 ref 로도 들고 있는다 —
  // 같은 틱에 두 번 눌려도 렌더 전 값으로 두 번 통과하지 않게(UserProvider 의 지갑과 같은 패턴).
  const selectedRef = useRef<string[]>([]);
  const commitSelected = useCallback((next: string[]) => {
    selectedRef.current = next;
    setSelected(next);
  }, []);

  // 기본 날짜: 오늘 — 오늘 예약할 수 있는 시간대가 다 지났으면(밤) 내일. 마감된 카드만 보이는 "클릭이 안 되는" 화면을 막는다
  const fallbackDate = useMemo(() => {
    if (today === null || now === null) return null;
    return hasOpenBlock(today, timeBlocks, now) ? today : addDays(today, 1);
  }, [today, now, timeBlocks]);
  const todayClosed = fallbackDate !== null && fallbackDate !== today;
  // 날짜: 고른 날이 없거나 범위를 벗어났으면(자정이 지남) 기본 날짜
  const date = pickedDate && range && pickedDate >= range.from && pickedDate <= range.to ? pickedDate : fallbackDate;
  const branch = branches.find((b) => b.id === branchId) ?? branches[0] ?? null;

  // 시간대: 고른 시간대가 지나가 버리면(자정 · 시간대 종료) 없는 것으로 — 고른 의자도 함께 버리고 일정 선택으로 돌아간다
  // (useMemo 는 성능보다 React Compiler 린트 때문이다 — date 와 now 를 함께 넘기는 이 호출을 렌더 본문에 두면 컴파일러가 아래 setter 들을 불안정하다고 본다)
  const pickedBlockNow = useMemo(
    () => (pickedBlock && date && now !== null ? blockState(date, pickedBlock, now) : null),
    [pickedBlock, date, now],
  );
  const block = pickedBlock && pickedBlockNow !== "CLOSED" ? pickedBlock : null;
  const blockNow = block ? pickedBlockNow : null;
  const selected = block ? rawSelected : EMPTY;
  const step: BookingStep = rawStep === "SEATS" && !block ? "SCHEDULE" : rawStep;

  const slot: SeatSlot | null = useMemo(
    () => (date && block && branch ? { branchId: branch.id, date, start: block.start, end: block.end } : null),
    [date, block, branch],
  );
  const slotKey = slot ? `${slot.branchId}|${slot.date}|${slot.start}` : null;

  // 시간대 좌석 상태(서버) — 시간대가 바뀌거나 분이 바뀌면(OPEN → LIVE 전환 · 다른 사람의 예약) 다시 받는다
  const [status, setStatus] = useState<StatusSnapshot | null>(null);
  useEffect(() => {
    if (!slotKey || now === null) return;
    const [branchId, date, start] = slotKey.split("|");
    const end = timeBlocks.find((b) => b.start === start)?.end ?? start;
    let alive = true;
    getChairStatuses({ branchId, date, start, end }).then(
      (map) => {
        if (alive) setStatus({ key: slotKey, map, fetchedAt: Date.now() });
      },
      () => {
        if (alive) setHint({ id: Date.now(), text: "좌석 상태를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
      },
    );
    return () => {
      alive = false;
    };
  }, [slotKey, now, timeBlocks, reloadKey]);

  // 그 날 시간대별 잔여석
  const dayKey = branch && date ? `${branch.id}|${date}` : null;
  const [availability, setAvailability] = useState<AvailabilitySnapshot | null>(null);
  useEffect(() => {
    if (!dayKey || now === null) return;
    const [branchId, date] = dayKey.split("|");
    let alive = true;
    getSlotAvailability(branchId, date).then(
      (list) => {
        if (alive) setAvailability({ key: dayKey, list });
      },
      () => {
        if (alive) setHint({ id: Date.now(), text: "남은 자리를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
      },
    );
    return () => {
      alive = false;
    };
  }, [dayKey, now, reloadKey]);

  // 같은 시간대의 내 예약 — 배치도에 "내 예약"으로 겹친다
  const myReservations = useMemo(
    () => (slot ? seatReservations.filter((r) => r.kind === "RESERVED" && sameSlot(r, slot)) : []),
    [seatReservations, slot],
  );
  const mine = useMemo(() => new Set(myReservations.flatMap((r) => r.chairIds)), [myReservations]);

  const statuses: ChairStatusMap | null = useMemo(() => {
    if (!status || status.key !== slotKey) return null;
    if (mine.size === 0) return status.map;
    const map: Record<string, ChairStatusMap[string]> = { ...status.map };
    mine.forEach((id) => {
      map[id] = "RESERVED";
    });
    return map;
  }, [status, slotKey, mine]);

  // 시간대 카드의 잔여석 — 서버가 내 예약까지 찬 자리로 세어 준 값 그대로
  const slots: SlotAvailability[] | null =
    availability && availability.key === dayKey ? availability.list : null;

  const summary: SeatSummaryData | null = useMemo(() => (statuses ? summarize(seats, statuses) : null), [seats, statuses]);

  // "마지막 업데이트" — 서버에서 받은 시각과 내 마지막 예약 중 나중 것
  const updatedAt = useMemo(() => {
    if (!status || status.key !== slotKey) return null;
    const myLatest = myReservations.reduce((max, r) => Math.max(max, Date.parse(r.reservedAt)), 0);
    return Math.max(status.fetchedAt, myLatest);
  }, [status, slotKey, myReservations]);

  const currentSlot = slots?.find((s) => s.start === block?.start) ?? null;
  const blockOpen = blockNow !== null && blockNow !== "CLOSED";
  const soldOut = currentSlot !== null && currentSlot.available === 0;
  const ready = Boolean(date && branch && people && block && blockOpen);
  const waitingHere = slot ? seatReservations.some((r) => r.kind === "WAITING" && sameSlot(r, slot)) : false;
  // 의자를 누를 수 있는가 — 시간대를 골라 상태를 받았으면 일정 선택 단계에서도 바로 고를 수 있다(완료 화면만 제외)
  const canPick = statuses !== null && blockOpen && step !== "DONE";

  const showHint = useCallback((text: string) => setHint({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(t);
  }, [hint]);

  // ---- 일정 선택 ----
  const pickDate = useCallback(
    (ymd: string) => {
      setPickedDate(ymd);
      setBlock(null);
      commitSelected([]);
    },
    [commitSelected],
  );

  const pickBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      setBlock(null);
      commitSelected([]);
    },
    [commitSelected],
  );

  const pickPeople = useCallback(
    (n: number | null) => {
      setPeople(n);
      const current = selectedRef.current;
      if (n !== null && current.length > n) commitSelected(current.slice(0, n));
    },
    [commitSelected],
  );

  const pickBlock = useCallback(
    (b: TimeBlock | null) => {
      setBlock(b);
      commitSelected([]);
    },
    [commitSelected],
  );

  const startSeats = useCallback(() => {
    if (!ready || soldOut) return;
    setStep("SEATS");
  }, [ready, soldOut]);

  const backToSchedule = useCallback(() => setStep("SCHEDULE"), []);

  // ---- 의자 고르기 — 일정 선택 단계에서 눌러도 되고, 그러면 선택 좌석 단계로 넘어간다 ----
  const toggleChair = useCallback(
    (id: string) => {
      if (!block || !blockOpen) return;
      if (people === null) {
        showHint("인원을 먼저 골라 주세요.");
        return;
      }
      if (mine.has(id)) {
        showHint("내가 이미 예약한 자리예요.");
        return;
      }
      const status = statuses?.[id] ?? "AVAILABLE";
      if (status !== "AVAILABLE") {
        showHint(status === "REPAIR" ? "수리 중인 자리예요." : "이미 예약되었거나 사용 중인 자리예요.");
        return;
      }
      const current = selectedRef.current;
      if (current.includes(id)) {
        commitSelected(current.filter((x) => x !== id));
        return;
      }
      if (current.length >= people) {
        showHint(`${people}명이라 ${people}석까지만 고를 수 있어요. 다른 자리를 빼고 골라 주세요.`);
        return;
      }
      commitSelected([...current, id]);
      setStep((s) => (s === "SCHEDULE" ? "SEATS" : s));
    },
    [block, blockOpen, mine, statuses, people, showHint, commitSelected],
  );

  /** 추천 카드 — 그 의자들로 선택을 바꾸고 선택 좌석 단계로(12단계). 그새 찬 자리는 뺀다 */
  const selectChairs = useCallback(
    (ids: string[]) => {
      if (!block || !blockOpen) return;
      if (people === null) {
        showHint("인원을 먼저 골라 주세요.");
        return;
      }
      const valid = ids.filter((id) => !mine.has(id) && (statuses?.[id] ?? "AVAILABLE") === "AVAILABLE").slice(0, people);
      if (valid.length === 0) {
        showHint("지금은 고를 수 없는 자리예요. 다른 추천을 눌러 주세요.");
        return;
      }
      commitSelected(valid);
      setStep((s) => (s === "SCHEDULE" ? "SEATS" : s));
      if (valid.length < people) showHint(`${valid.length}석만 비어 있어요. 나머지는 배치도에서 골라 주세요.`);
    },
    [block, blockOpen, people, mine, statuses, showHint, commitSelected],
  );

  const removeChair = useCallback(
    (id: string) => commitSelected(selectedRef.current.filter((x) => x !== id)),
    [commitSelected],
  );
  const clearSelected = useCallback(() => commitSelected([]), [commitSelected]);

  const chairById = useMemo(() => new Map(chairs.map((c) => [c.id, c])), [chairs]);
  const selectedChairs = useMemo(
    () => selected.map((id) => chairById.get(id)).filter((c): c is Chair => c !== undefined),
    [selected, chairById],
  );

  // ---- 예약 · 예약대기 ----
  const reserve = useCallback(async (): Promise<SeatReservation | null> => {
    if (!slot || !branch || people === null || selected.length !== people || busy) return null;
    setBusy(true);
    try {
      const result = await reserveChairs({ slot, people, chairIds: selected });
      await refreshSeatReservations(); // 배치도에 "내 예약"이 바로 겹치도록 완료 화면 전에 받는다
      setReservation(result);
      commitSelected([]);
      setStep("DONE");
      return result;
    } finally {
      // 성공하면 잔여석이 줄고, 실패(다른 사람이 먼저 잡음 등)하면 찬 자리를 배치도에 보여 줘야 한다 — 둘 다 다시 받는다
      reload();
      setBusy(false);
    }
  }, [slot, branch, people, selected, busy, refreshSeatReservations, reload, commitSelected]);

  const joinWaitlist = useCallback(async (): Promise<SeatReservation | null> => {
    if (!slot || !branch || people === null || busy) return null;
    setBusy(true);
    try {
      const result = await joinWaitlistService({ slot, people });
      await refreshSeatReservations();
      return result;
    } finally {
      setBusy(false);
    }
  }, [slot, branch, people, busy, refreshSeatReservations]);

  /** 완료 뒤 "다른 좌석 예약하기" · 페이지가 숨겨질 때 — 날짜 · 지점 · 인원은 남기고 시간대 · 선택만 비운다 */
  const restart = useCallback(() => {
    setStep("SCHEDULE");
    setBlock(null);
    commitSelected([]);
    setReservation(null);
  }, [commitSelected]);

  return {
    now,
    today,
    range,
    step,
    date,
    branch,
    branches,
    people,
    block,
    timeBlocks,
    slots,
    currentSlot,
    blockNow,
    slot,
    statuses,
    mine,
    selected,
    selectedChairs,
    summary,
    updatedAt,
    hint,
    busy,
    reservation,
    ready,
    soldOut,
    waitingHere,
    canPick,
    todayClosed,
    pickDate,
    pickBranch,
    pickPeople,
    pickBlock,
    startSeats,
    backToSchedule,
    toggleChair,
    selectChairs,
    removeChair,
    clearSelected,
    reserve,
    joinWaitlist,
    restart,
    showHint,
  };
}

export type SeatBooking = ReturnType<typeof useSeatBooking>;
