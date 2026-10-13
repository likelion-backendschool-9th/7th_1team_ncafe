"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvents } from "@/app/(site)/event/_hooks/useEvents";
import {
  autoStatus,
  EVENT_STATUS_LABEL,
  EVENT_STATUSES,
  eventStatus,
  formatEventPeriod,
  isShownOnSite,
  statusHint,
  statusReason,
  visibilityReason,
} from "@/app/(site)/event/_lib/eventStatus";
import type { CafeEvent } from "@/app/(site)/event/_types";
import Modal from "@/components/Modal";
import { formatRaceTimes } from "@/lib/time";
import { useKstToday } from "@/lib/useCountdown";
import { useRaceTimes } from "@/lib/useRaceTimes";
import adminStyles from "../../_components/admin.module.css";
import AdminToast from "../../_components/AdminToast";
import ConfirmDialog from "../../_components/ConfirmDialog";
import { useEventEditor } from "../_hooks/useEventEditor";
import { SiteBadge, StatusBadges } from "./EventBadges";
import EventForm from "./EventForm";
import styles from "./eventAdmin.module.css";

/**
 * 이벤트 상세(관리자) — /admin/event/[id]. 진행 상태(자동/직접 지정) · 손님 화면 노출(노출 허가)을 바로 바꾸고,
 * 이벤트 정보 전체를 표로 본다. [수정]은 목록과 같은 폼(모달), [삭제]하면 목록으로 돌아간다.
 */
export default function EventAdminDetail({ id }: { id: number | null }) {
  const events = useEvents();
  const today = useKstToday();
  const raceTimes = formatRaceTimes(useRaceTimes());
  const a = useEventEditor(events);
  const router = useRouter();
  const event = id === null ? null : (events.find((e) => e.id === id) ?? null);

  async function handleDelete() {
    if (await a.confirmDelete()) router.push("/admin/event");
  }

  const crumbs = (
    <nav className={styles.crumbs} aria-label="현재 위치">
      <Link href="/admin/event">← 이벤트 관리</Link>
      {event && (
        <>
          <span aria-hidden>/</span>
          <span aria-current="page">{event.title}</span>
        </>
      )}
    </nav>
  );

  if (today === null) {
    return (
      <>
        {crumbs}
        <p className={styles.loading} aria-busy="true">
          이벤트를 불러오는 중…
        </p>
      </>
    );
  }

  if (!event) {
    return (
      <>
        {crumbs}
        <div className={adminStyles.empty}>
          <p>이벤트를 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었어요.</p>
          <Link href="/admin/event" className="btn btn-sm">
            이벤트 목록으로
          </Link>
        </div>
        <AdminToast toast={a.toast} />
      </>
    );
  }

  const status = eventStatus(event, today);
  const shown = isShownOnSite(event, today);

  return (
    <>
      {crumbs}

      <header className={adminStyles.pageHead}>
        <div>
          <span className="eyebrow">Event No.{String(event.id).padStart(2, "0")}</span>
          <h1 className={adminStyles.pageTitle}>{event.title}</h1>
          <p className="subtitle">
            <StatusBadges event={event} status={status} hint={statusHint(event, today)} /> <SiteBadge shown={shown} status={status} />
          </p>
        </div>
        <div className={styles.headActions}>
          {shown && (
            <Link href={`/event/${event.id}`} className="btn btn-outline" target="_blank" rel="noopener">
              손님 화면에서 보기 <span aria-hidden>↗</span>
              <span className="visually-hidden">(새 탭)</span>
            </Link>
          )}
          <button type="button" className="btn btn-outline" onClick={() => a.openEdit(event)}>
            수정
          </button>
          <button type="button" className={`btn ${adminStyles.btnDangerOutline}`} onClick={() => a.askDelete(event)}>
            삭제
          </button>
        </div>
      </header>

      <div className={styles.panels}>
        <section className={styles.panel} aria-labelledby="status-panel-title">
          <h2 id="status-panel-title" className={styles.panelTitle}>
            진행 상태 — {EVENT_STATUS_LABEL[status]}
          </h2>
          <p className={styles.panelText}>{statusReason(event, today)}</p>
          <fieldset>
            <legend className="visually-hidden">진행 상태 지정</legend>
            <div className={styles.segment}>
              <label>
                <input
                  type="radio"
                  name="status-override"
                  checked={event.statusOverride === null}
                  onChange={() => a.setStatus(event, null)}
                />
                자동 ({EVENT_STATUS_LABEL[autoStatus(event, today)]})
              </label>
              {EVENT_STATUSES.map((s) => (
                <label key={s}>
                  <input
                    type="radio"
                    name="status-override"
                    checked={event.statusOverride === s}
                    onChange={() => a.setStatus(event, s)}
                  />
                  {EVENT_STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </fieldset>
          <p className={adminStyles.hint}>자동은 시작일 · 종료일과 오늘 날짜로 정해요. 직접 고르면 날짜보다 우선해요.</p>
        </section>

        <section className={styles.panel} aria-labelledby="site-panel-title">
          <h2 id="site-panel-title" className={styles.panelTitle}>
            손님 화면 노출 — {shown ? "보임" : "숨김"}
          </h2>
          <p className={styles.panelText}>{visibilityReason(event, today)}</p>
          <div className={styles.switchRow}>
            <button
              type="button"
              role="switch"
              aria-checked={event.visible}
              aria-labelledby="visible-label"
              className={adminStyles.switch}
              onClick={() => a.setVisible(event, !event.visible)}
            >
              <span className={adminStyles.switchKnob} aria-hidden />
              <span className={adminStyles.switchText}>{event.visible ? "ON" : "OFF"}</span>
            </button>
            <span id="visible-label">노출 허가</span>
          </div>
          <p className={adminStyles.hint}>진행 중인 이벤트는 늘 보여요. 노출 허가는 예정 · 종료 이벤트를 미리 알리거나 남겨 둘 때 켜요.</p>
        </section>
      </div>

      <EventInfo event={event} raceTimes={raceTimes} />

      <Modal open={a.editing !== null} onClose={a.closeForm} label="이벤트 수정" size="lg" variant="sheet" dismissible={false}>
        {a.editing?.mode === "edit" && (
          <EventForm
            key={a.editing.event.id}
            initial={a.editing.event}
            today={today}
            raceTimes={raceTimes}
            errors={a.errors}
            busy={a.busy}
            onSubmit={a.save}
            onCancel={a.closeForm}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={a.deleting !== null}
        title="이벤트 삭제"
        message={
          <>
            <strong>{a.deleting?.title}</strong> 이벤트를 삭제할까요?
            <br />
            삭제한 이벤트는 되돌릴 수 없어요. 잠시 내리려면 상태를 <strong>종료</strong>로 지정하세요.
          </>
        }
        confirmLabel="삭제"
        busy={a.busy}
        onConfirm={handleDelete}
        onCancel={a.cancelDelete}
      />

      <AdminToast toast={a.toast} />
    </>
  );
}

const TIME_MODE_LABEL = { NONE: "없음", TEXT: "직접 입력", RACE: "경주 시간표 따라감" } as const;

/** 이벤트 정보 전체 — 폼에 들어가는 값을 한눈에 */
function EventInfo({ event, raceTimes }: { event: CafeEvent; raceTimes: string }) {
  return (
    <dl className={styles.info}>
      <dt>기간</dt>
      <dd>
        {formatEventPeriod(event)}
        {!event.endDate && <span className={styles.muted}> · 종료일 없음</span>}
      </dd>

      <dt>운영 안내</dt>
      <dd>{event.period}</dd>

      <dt>시각 표시</dt>
      <dd>
        {event.timeMode === "RACE" ? raceTimes : event.timeMode === "TEXT" ? event.time : <span className={styles.muted}>표시 안 함</span>}
        {event.timeMode !== "NONE" && <span className={styles.muted}> · {TIME_MODE_LABEL[event.timeMode]}</span>}
      </dd>

      <dt>설명</dt>
      <dd>{event.description}</dd>

      <dt>참여 방법</dt>
      <dd>
        {event.steps.length ? (
          <ol>
            {event.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        ) : (
          <span className={styles.muted}>없음 — 손님 화면에는 &quot;자동으로 적용돼요&quot;로 보여요</span>
        )}
      </dd>

      <dt>유의 사항</dt>
      <dd>
        {event.notes.length ? (
          <ul>
            {event.notes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <span className={styles.muted}>없음</span>
        )}
      </dd>

      <dt>이동 버튼</dt>
      <dd>
        {event.ctaLabel && event.ctaHref ? (
          <>
            {event.ctaLabel} <span className={styles.code}>→ {event.ctaHref}</span>
          </>
        ) : (
          <span className={styles.muted}>없음</span>
        )}
      </dd>
    </dl>
  );
}
