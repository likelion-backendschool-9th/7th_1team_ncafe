"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { formatYmdKo, formatKstTime, kstDate } from "@/lib/kst";
import { useEvents, useMyApplies } from "../../event/_hooks/useEvents";
import { branchName, EVENT_TYPE_LABEL } from "../../event/_lib/eventStatus";
import type { EventApply } from "../../event/_types";
import { useShowMore } from "../_hooks/useShowMore";
import { SectionEmpty, SectionHead, ShowMoreButton } from "./MySection";
import styles from "./my.module.css";

const PREVIEW = 5;
const LOGIN_HREF = `/login?next=${encodeURIComponent("/my#events")}`;

/**
 * 내 이벤트 참여 — /event 에서 신청한 이벤트, 최신순(사용자 결정 2026-10-27: 마이페이지에 별도 영역). 처음엔 최근 5건, "전체 보기"로 나머지를 펼친다.
 * 한 줄 = 신청 날짜 · 시각 STUB ┊ 지점 · 이벤트 이름(상세 링크) · 종류 ┊ 결과(쿠폰 N장 지급 / 참여 완료). 신청 취소는 없다.
 * 신청 기록(GET /api/v1/events/applies/me)에 이벤트 이름 · 지점 · 종류 · 지급 쿠폰 수가 함께 온다 — 지급 쿠폰 수는 신청자가 생기면 관리자가 바꿀 수 없어 받은 수와 같다.
 * 이벤트 이름은 지금 손님 화면에 보이는 이벤트일 때만 상세 링크로 둔다. 로그인하지 않았으면 로그인 안내.
 */
export default function MyEvents() {
  const { member, loaded: authLoaded } = useAuth();
  const shownIds = new Set(useEvents().data.map((e) => e.id));
  const { data: applies, loaded } = useMyApplies(member?.no ?? null);
  const { visible, expanded, hasMore, total, toggle } = useShowMore(applies, PREVIEW);

  return (
    <section id="events" className={styles.section} aria-labelledby="events-title">
      <SectionHead id="events" label="MY EVENTS" title="내 이벤트 참여" meta={member && loaded ? `${applies.length}건` : ""} />

      {authLoaded && !member ? (
        <SectionEmpty
          title="로그인하면 내 이벤트 참여가 보여요"
          action={
            <Link href={LOGIN_HREF} className="btn btn-outline btn-sm">
              로그인
            </Link>
          }
        >
          지점 이벤트에 참여 신청하면 신청한 이벤트와 받은 쿠폰이 회원 계정에 기록돼요.
        </SectionEmpty>
      ) : !member || !loaded ? null : applies.length === 0 ? (
        <SectionEmpty
          title="아직 참여한 이벤트가 없어요"
          action={
            <Link href="/event" className="btn btn-outline btn-sm">
              이벤트 보기
            </Link>
          }
        >
          지점 이벤트에 참여 신청하면 신청한 이벤트와 받은 쿠폰이 여기에 모여요.
        </SectionEmpty>
      ) : (
        <>
          <ol id="events-list" className={styles.eventList}>
            {visible.map((apply) => (
              <EventRow key={apply.applyId} apply={apply} linked={shownIds.has(apply.eventId)} />
            ))}
          </ol>
          {hasMore && <ShowMoreButton expanded={expanded} total={total} onToggle={toggle} controls="events-list" />}
        </>
      )}
    </section>
  );
}

function EventRow({ apply, linked }: { apply: EventApply; linked: boolean }) {
  const at = Date.parse(apply.appliedDate);

  return (
    <li className={styles.eventRow}>
      <div className={styles.eventStub}>
        <time className={styles.eventDate} dateTime={apply.appliedDate}>
          {formatYmdKo(kstDate(at), false)}
        </time>
        <span className={styles.eventTime}>{formatKstTime(at)}</span>
      </div>

      <div className={styles.eventBody}>
        <span className={styles.eventBranch}>{branchName(apply.branchId)}</span>
        {linked ? (
          <Link href={`/event/${apply.eventId}`} className={styles.eventTitle}>
            {apply.eventTitle}
          </Link>
        ) : (
          <span className={styles.eventTitle}>{apply.eventTitle}</span>
        )}
      </div>

      <div className={styles.eventResult}>
        {apply.coupon ? (
          <span className={styles.eventCoupon}>
            쿠폰 <strong>{apply.couponAmount}</strong>장 지급
          </span>
        ) : (
          <span className={styles.eventJoined}>{EVENT_TYPE_LABEL.JOIN} · 참여 완료</span>
        )}
      </div>
    </li>
  );
}
