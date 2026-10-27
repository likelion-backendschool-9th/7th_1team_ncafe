"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSeatBooking } from "../_hooks/useSeatBooking";
import { useSeatFilter } from "../_hooks/useSeatFilter";
import { matchesFilter } from "../_lib/filter";
import { recommendSeats, type RecommendResult } from "../_lib/recommend";
import { totalChairs } from "../_lib/summary";
import type { Branch, BranchLayout, TimeBlock } from "../_types";
import BookingBar from "./BookingBar";
import BranchFromQuery from "./BranchFromQuery";
import RecommendedSeat, { type RecommendState } from "./RecommendedSeat";
import ReservationDone from "./ReservationDone";
import ReserveConfirmModal from "./ReserveConfirmModal";
import SchedulePanel from "./SchedulePanel";
import SeatCanvas from "./SeatCanvas";
import SeatFilter from "./SeatFilter";
import styles from "./seat.module.css";
import SelectionPanel, { SelectionBar } from "./SelectionPanel";
import WaitlistModal from "./WaitlistModal";

interface SeatBookingProps {
  layouts: Record<string, BranchLayout>; // 지점 id → 배치도(평면도 + 좌석)
  branches: Branch[];
  timeBlocks: TimeBlock[];
}

const EMPTY_RESULT: RecommendResult = { picks: [], fallback: null };
const NONE: ReadonlySet<string> = new Set();

/**
 * 좌석 예약 화면 조립 — BLUEPRINT 8.3.
 * [일정 바] / [배치도 캔버스(필터 줄 · 추천 줄 포함) | 패널(일정 선택 → 선택 좌석 → 완료)] + 예약 안내 · 예약대기 모달.
 * 예약 상태는 useSeatBooking, 필터는 useSeatFilter 에 있고, 여기서는 둘을 합쳐(반투명 자리 · 추천) 넘기며 모달 열림만 들고 있다.
 * 배치도(평면도 · 좌석)는 고른 지점 것을 useSeatBooking 이 골라 준다.
 */
export default function SeatBooking({ layouts, branches, timeBlocks }: SeatBookingProps) {
  const booking = useSeatBooking({ layouts, branches, timeBlocks });
  const { floorPlan, seats, chairs } = booking;
  const total = useMemo(() => totalChairs(seats), [seats]);
  const { step, slot, statuses, mine, selected, summary, branch, people, blockNow, waitingHere, reservation, canPick, hint, toggleChair, selectChairs, reserve, restart } =
    booking;
  const filterControls = useSeatFilter();
  const { filter, active: filterActive } = filterControls;
  const [confirming, setConfirming] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [error, setError] = useState("");
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // 다른 페이지로 가면 이 화면은 <Activity> 로 숨는다 — 열려 있던 모달은 닫고, 완료 화면이었으면 처음으로(8.9 Activity 주의).
  useLayoutEffect(() => {
    return () => {
      setConfirming(false);
      setWaitlistOpen(false);
      setError("");
      if (stepRef.current === "DONE") restart();
    };
  }, [restart]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // 필터(12단계) — 조건을 골랐을 때만 맞지 않는 자리를 반투명으로. 추천은 고른 시간대 · 인원 기준
  const dimSeats = useMemo(() => {
    if (!filterActive) return NONE;
    return new Set(seats.filter((seat) => !matchesFilter(seat, filter, people, statuses)).map((seat) => seat.id));
  }, [filterActive, seats, filter, people, statuses]);
  const recommendation = useMemo(
    () => (statuses && people !== null ? recommendSeats(seats, statuses, filter, people) : EMPTY_RESULT),
    [seats, statuses, filter, people],
  );
  const recommendedSeats = useMemo(() => new Set(recommendation.picks.filter((p) => p.seat.type === "TABLE").map((p) => p.seat.id)), [recommendation]);
  const recommendedChairs = useMemo(() => new Set(recommendation.picks.filter((p) => p.seat.type === "BAR").flatMap((p) => p.chairIds)), [recommendation]);
  const recommendState: RecommendState = !slot || !statuses ? "NO_SLOT" : people === null ? "NO_PEOPLE" : "READY";

  const dimmed = !slot ? "날짜 · 지점 · 시간대를 고르면 좌석 현황이 보여요" : statuses === null ? "좌석 현황을 불러오는 중…" : null;
  // 제목 아래 한 줄 — 안내(hint)가 있으면 그것을(모바일에서는 패널이 멀어 여기서도 보여야 한다), 아니면 단계 설명
  const caption =
    hint?.text ??
    (step === "DONE"
      ? "내 예약은 자물쇠 + 점선 테두리로 표시돼요"
      : statuses
        ? people
          ? `${people}명 · 빈 자리를 눌러 고르세요`
          : "인원을 고르면 자리를 고를 수 있어요"
        : null);
  const waitlistEnabled = step !== "DONE" && slot !== null && people !== null && blockNow !== null && blockNow !== "CLOSED";

  const confirmReserve = async () => {
    setError("");
    try {
      const result = await reserve();
      if (result) setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        <BranchFromQuery branches={branches} onPick={booking.pickBranch} />
      </Suspense>
      <BookingBar booking={booking} total={total} />

      <div className={styles.layout} data-step={step}>
        <SeatCanvas
          plan={floorPlan}
          seats={seats}
          chairs={chairs}
          statuses={statuses}
          mine={mine}
          selected={selectedSet}
          interactive={canPick}
          branchName={branch?.name ?? null}
          summary={summary}
          caption={caption}
          dimmed={dimmed}
          waitlist={{ enabled: waitlistEnabled, done: waitingHere, onOpen: () => setWaitlistOpen(true) }}
          toolbar={
            step !== "DONE" && (
              <>
                <SeatFilter controls={filterControls} people={people} />
                <RecommendedSeat state={recommendState} result={recommendation} onPick={selectChairs} />
              </>
            )
          }
          dimSeats={dimSeats}
          recommendedSeats={recommendedSeats}
          recommendedChairs={recommendedChairs}
          onToggle={toggleChair}
        />

        <aside className={styles.panel} aria-label="예약 패널">
          {step === "SCHEDULE" && <SchedulePanel booking={booking} onWaitlist={() => setWaitlistOpen(true)} />}
          {step === "SEATS" && <SelectionPanel booking={booking} onReserve={() => setConfirming(true)} />}
          {step === "DONE" && reservation && <ReservationDone reservation={reservation} onRestart={restart} />}
        </aside>

        {step === "SEATS" && <SelectionBar booking={booking} onReserve={() => setConfirming(true)} />}
      </div>

      <ReserveConfirmModal
        open={confirming}
        booking={booking}
        error={error}
        onCancel={() => !booking.busy && setConfirming(false)}
        onConfirm={confirmReserve}
      />
      <WaitlistModal open={waitlistOpen} booking={booking} onClose={() => setWaitlistOpen(false)} />
    </>
  );
}
