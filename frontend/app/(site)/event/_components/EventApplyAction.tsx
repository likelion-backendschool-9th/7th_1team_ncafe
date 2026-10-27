"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import { useMyApplies } from "../_hooks/useEvents";
import { applyEvent, EventError } from "../_lib/eventService";
import { applyState, branchName, seatsLeft } from "../_lib/eventStatus";
import { eventsStore, myAppliesStore } from "../_lib/eventStore";
import type { CafeEvent } from "../_types";
import styles from "./event.module.css";

const APPLY_ERROR: Record<string, string> = {
  EVENT_FULL: "방금 선착순이 마감됐어요. 다음 이벤트를 기다려 주세요.",
  EVENT_ALREADY_APPLIED: "이미 신청한 이벤트예요.",
  EVENT_NOT_ONGOING: "지금은 신청할 수 없는 이벤트예요.",
  EVENT_NOT_FOUND: "지금은 볼 수 없는 이벤트예요.",
};

type Step = { kind: "confirm"; error: string } | { kind: "done"; coupons: number } | null;

/**
 * 참여 신청 — 목록 카드(card)와 상세(detail)가 함께 쓴다. 지금 할 수 있는 일(applyState)에 따라:
 * 신청 가능 → [참여 신청] → 확인 창(취소 없음 안내) → 완료 창 / 선착순 마감 → 카드는 신청 대신 이벤트 페이지로, 상세는 마감 안내 /
 * 이미 신청 → 참여 완료 표시 / 예정 · 종료 → 카드는 아무것도 없고, 상세는 안내 한 줄. 로그인하지 않았으면 [참여 신청]이 로그인으로 보낸다.
 * 신청은 서버(POST /api/v1/events/{id}/applies)가 처리하고 쿠폰 지급 이벤트면 그 자리에서 쿠폰을 적립한다 — 끝나면 목록 · 내 신청 · 쿠폰 수를 다시 불러온다.
 */
export default function EventApplyAction({ event, today, variant }: { event: CafeEvent; today: string; variant: "card" | "detail" }) {
  const { member, refresh: refreshMember } = useAuth();
  const applied = useMyApplies(member?.no ?? null).data.some((a) => a.eventId === event.id);
  const [step, setStep] = useState<Step>(null);
  const [busy, setBusy] = useState(false);
  const detailHref = `/event/${event.id}`;
  const state = applyState(event, today, applied);

  async function submit() {
    if (!member || busy) return;
    setBusy(true);
    try {
      await applyEvent(event.id);
      setStep({ kind: "done", coupons: event.coupon ? (event.couponAmount ?? 0) : 0 });
    } catch (e) {
      const message =
        e instanceof EventError ? (APPLY_ERROR[e.code] ?? e.message) : "신청하지 못했어요. 잠시 후 다시 시도해 주세요.";
      setStep({ kind: "confirm", error: message });
    } finally {
      setBusy(false);
      // 성공하면 참여 인원 · 내 신청 · 쿠폰 수가, 실패하면(방금 마감 등) 최신 현황이 보이도록
      void Promise.all([eventsStore.refresh(), myAppliesStore.refresh(), refreshMember()]);
    }
  }

  let action;
  if (state === "OPEN") {
    action = member ? (
      <button type="button" className={`btn btn-gold ${styles.applyBtn}`} onClick={() => setStep({ kind: "confirm", error: "" })}>
        참여 신청<span className="visually-hidden"> — {event.title}</span>
      </button>
    ) : (
      <Link href={`/login?next=${encodeURIComponent(detailHref)}`} className={`btn btn-gold ${styles.applyBtn}`}>
        참여 신청
        <span className="visually-hidden"> — {event.title} (로그인 필요)</span>
      </Link>
    );
  } else if (state === "APPLIED") {
    action = (
      <span className={styles.appliedTag}>
        <span>
          <span aria-hidden>✓</span> 참여 완료
        </span>
        {event.coupon && <small>쿠폰 {event.couponAmount}장 지급</small>}
      </span>
    );
  } else if (state === "FULL") {
    // 선착순 마감 — 카드에서는 신청 대신 이벤트 페이지를 보여 준다(사용자 결정 2026-10-27), 상세에서는 이미 그 페이지라 안내만
    action =
      variant === "card" ? (
        <Link href={detailHref} className={`btn ${styles.fullBtn}`}>
          선착순 마감
          <span className="visually-hidden"> — {event.title} 이벤트 보기</span>
        </Link>
      ) : (
        <p className={styles.closedNote}>
          <strong>선착순 마감</strong> 준비한 쿠폰이 모두 나갔어요. 다음 이벤트를 기다려 주세요.
        </p>
      );
  } else if (variant === "detail") {
    action = (
      <p className={styles.closedNote}>
        {state === "UPCOMING" ? "시작일부터 참여 신청을 받아요." : "종료된 이벤트라 더 이상 신청을 받지 않아요."}
      </p>
    );
  } else {
    action = null;
  }

  const left = seatsLeft(event);

  // 창은 body 로 띄운다 — 티켓(.ticket)의 mask 가 position: fixed 의 기준이 되어 창이 카드 안에 잘리므로
  return (
    <>
      {action}

      {step !== null &&
        createPortal(
          <Modal
            open={step !== null}
            onClose={() => setStep(null)}
            label={step?.kind === "done" ? "참여 신청 완료" : "참여 신청"}
            variant="sheet"
            dismissible={!busy}
          >
            {step?.kind === "confirm" && (
              <div className={styles.confirm}>
                <span className={styles.confirmEyebrow}>EVENT APPLY</span>
                <h2 className={styles.confirmTitle}>참여 신청</h2>
                <dl className={styles.confirmTicket}>
                  <div>
                    <dt>이벤트</dt>
                    <dd>{event.title}</dd>
                  </div>
                  <div>
                    <dt>지점</dt>
                    <dd>{branchName(event.branchId)}</dd>
                  </div>
                  <div>
                    <dt>혜택</dt>
                    <dd>{event.coupon ? `쿠폰 ${event.couponAmount}장 · 선착순 ${event.capacity}명` : "쿠폰 없는 참여 이벤트"}</dd>
                  </div>
                  {left !== null && (
                    <div>
                      <dt>남은 자리</dt>
                      <dd>{left}명</dd>
                    </div>
                  )}
                </dl>
                <p className={styles.confirmNote}>
                  신청 후에는 <strong>취소할 수 없어요.</strong> 회원 한 명당 한 번만 신청할 수 있어요.
                </p>
                {step.error && (
                  <p className={styles.confirmError} role="alert">
                    {step.error}
                  </p>
                )}
                <div className={styles.confirmActions}>
                  {step.error ? (
                    // 신청할 수 없게 됐으면(방금 마감 등) 닫기만 남긴다
                    <button type="button" className="btn btn-outline" onClick={() => setStep(null)}>
                      닫기
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-outline" onClick={() => setStep(null)} disabled={busy}>
                        취소
                      </button>
                      <button type="button" className="btn btn-gold" onClick={submit} disabled={busy}>
                        {busy ? "신청하는 중…" : "신청하기"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {step?.kind === "done" && (
              <div className={styles.confirm}>
                <span className={styles.confirmEyebrow}>APPLIED</span>
                <h2 className={styles.confirmTitle}>참여 신청 완료</h2>
                <p className={styles.confirmNote}>
                  {step.coupons > 0 ? (
                    <>
                      선착순 안에 들어 <strong>쿠폰 {step.coupons}장</strong>이 지급됐어요.
                    </>
                  ) : (
                    "신청이 접수됐어요."
                  )}
                  <br />
                  마이페이지의 &apos;내 이벤트 참여&apos;에서 다시 볼 수 있어요.
                </p>
                <div className={styles.confirmActions}>
                  <button type="button" className="btn btn-outline" onClick={() => setStep(null)}>
                    닫기
                  </button>
                  <Link href="/my#events" className="btn">
                    마이페이지
                  </Link>
                </div>
              </div>
            )}
          </Modal>,
          document.body,
        )}
    </>
  );
}
