"use client";

import Link from "next/link";
import { useState } from "react";
import { useEvents } from "@/app/(site)/event/_hooks/useEvents";
import { resetEvents } from "@/app/(site)/event/_lib/eventService";
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUSES,
  eventStatus,
  eventTimeText,
  formatEventPeriod,
  isShownOnSite,
  statusHint,
} from "@/app/(site)/event/_lib/eventStatus";
import type { EventStatus } from "@/app/(site)/event/_types";
import Modal from "@/components/Modal";
import { useKstToday, useRaceDayText } from "@/lib/useCountdown";
import adminStyles from "../../_components/admin.module.css";
import AdminToast from "../../_components/AdminToast";
import ConfirmDialog from "../../_components/ConfirmDialog";
import { useEventEditor } from "../_hooks/useEventEditor";
import { SiteBadge, StatusBadges } from "./EventBadges";
import EventForm from "./EventForm";
import styles from "./eventAdmin.module.css";

type StatusFilter = EventStatus | "ALL";
type SiteFilter = "ALL" | "SHOWN" | "HIDDEN";

/**
 * 이벤트 관리 목록 — 검색 · 상태 · 손님 화면 노출로 거르고, 표에서 노출 허가를 바로 켜고 끈다. 이름을 누르면 상세(/admin/event/[id]).
 * 상태는 오늘 날짜(KST)로 계산하므로 시계를 읽은 뒤에 그린다.
 */
export default function EventAdminList() {
  const events = useEvents();
  const today = useKstToday();
  const raceTimes = useRaceDayText() ?? "";
  const a = useEventEditor(events);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [siteFilter, setSiteFilter] = useState<SiteFilter>("ALL");
  const [resetting, setResetting] = useState(false);

  const head = (
    <header className={adminStyles.pageHead}>
      <div>
        <span className="eyebrow">Event Management</span>
        <h1 className={adminStyles.pageTitle}>이벤트 관리</h1>
        <p className="subtitle">
          {today === null
            ? `전체 ${events.length}개`
            : `전체 ${events.length}개 · 진행 중 ${events.filter((e) => eventStatus(e, today) === "ONGOING").length}개 · 손님 화면에 보이는 이벤트 ${events.filter((e) => isShownOnSite(e, today)).length}개`}
        </p>
      </div>
      <button type="button" className="btn btn-gold" onClick={a.openCreate}>
        + 이벤트 등록
      </button>
    </header>
  );

  if (today === null) {
    return (
      <>
        {head}
        <p className={styles.loading} aria-busy="true">
          이벤트를 불러오는 중…
        </p>
      </>
    );
  }

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || statusFilter !== "ALL" || siteFilter !== "ALL";
  const filtered = events.filter((e) => {
    const shown = isShownOnSite(e, today);
    return (
      (statusFilter === "ALL" || eventStatus(e, today) === statusFilter) &&
      (siteFilter === "ALL" || (siteFilter === "SHOWN") === shown) &&
      (!q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.period.includes(q))
    );
  });
  const resetFilters = () => {
    setQuery("");
    setStatusFilter("ALL");
    setSiteFilter("ALL");
  };

  async function confirmReset() {
    await resetEvents();
    setResetting(false);
    a.show("기본 이벤트로 되돌렸어요.");
  }

  return (
    <>
      {head}

      <div className={adminStyles.toolbar} role="search">
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>검색</span>
          <input
            type="search"
            className={adminStyles.input}
            placeholder="이름 · 설명 · 운영 안내"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>상태</span>
          <select className={adminStyles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="ALL">전체</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EVENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>손님 화면</span>
          <select className={adminStyles.input} value={siteFilter} onChange={(e) => setSiteFilter(e.target.value as SiteFilter)}>
            <option value="ALL">전체</option>
            <option value="SHOWN">보이는 이벤트</option>
            <option value="HIDDEN">숨겨진 이벤트</option>
          </select>
        </label>
        {filtering && (
          <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
            필터 초기화
          </button>
        )}
      </div>

      <p className={adminStyles.resultCount} aria-live="polite">
        {filtering ? `검색 결과 ${filtered.length}개` : `${filtered.length}개 이벤트`}
      </p>

      {filtered.length === 0 ? (
        <div className={adminStyles.empty}>
          <p>{filtering ? "조건에 맞는 이벤트가 없습니다." : "등록된 이벤트가 없습니다."}</p>
          {filtering ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
              필터 초기화
            </button>
          ) : (
            <button type="button" className="btn btn-sm" onClick={a.openCreate}>
              첫 이벤트 등록하기
            </button>
          )}
        </div>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">이벤트</th>
              <th scope="col">기간</th>
              <th scope="col">상태</th>
              <th scope="col">손님 화면</th>
              <th scope="col">
                <span className="visually-hidden">관리</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const status = eventStatus(e, today);
              const shown = isShownOnSite(e, today);
              const time = eventTimeText(e, raceTimes);
              return (
                <tr key={e.id} className={shown ? undefined : adminStyles.rowMuted}>
                  <td data-label="No." className={styles.serial}>
                    {String(e.id).padStart(2, "0")}
                  </td>
                  <td data-label="이벤트" className={adminStyles.cellName}>
                    <div className={adminStyles.nameBlock}>
                      <Link href={`/admin/event/${e.id}`} className={styles.titleLink}>
                        {e.title}
                      </Link>
                      <span>
                        {e.period}
                        {time && ` · ${time}`}
                      </span>
                    </div>
                  </td>
                  <td data-label="기간" className={styles.period}>
                    {formatEventPeriod(e)}
                  </td>
                  <td data-label="상태">
                    <StatusBadges event={e} status={status} hint={statusHint(e, today)} />
                  </td>
                  <td data-label="손님 화면">
                    <div className={styles.visCell}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={e.visible}
                        aria-label={`${e.title} 노출 허가`}
                        className={adminStyles.switch}
                        onClick={() => a.setVisible(e, !e.visible)}
                      >
                        <span className={adminStyles.switchKnob} aria-hidden />
                        <span className={adminStyles.switchText}>{e.visible ? "ON" : "OFF"}</span>
                      </button>
                      <SiteBadge shown={shown} status={status} />
                    </div>
                  </td>
                  <td className={adminStyles.cellActions}>
                    <Link href={`/admin/event/${e.id}`} className="btn btn-outline btn-sm">
                      상세<span className="visually-hidden"> {e.title}</span>
                    </Link>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => a.openEdit(e)}>
                      수정<span className="visually-hidden"> {e.title}</span>
                    </button>
                    <button type="button" className={`btn btn-sm ${adminStyles.btnDangerOutline}`} onClick={() => a.askDelete(e)}>
                      삭제<span className="visually-hidden"> {e.title}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className={styles.listFoot}>
        <p className={adminStyles.note}>
          손님 화면(/event)에는 진행 중인 이벤트와 노출 허가를 켠 이벤트만 보여요. 상태는 날짜로 자동 계산되고, 상세에서 직접 지정할 수 있어요.
        </p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setResetting(true)}>
          기본 이벤트로 되돌리기
        </button>
      </div>

      <Modal
        open={a.editing !== null}
        onClose={a.closeForm}
        label={a.editing?.mode === "edit" ? "이벤트 수정" : "이벤트 등록"}
        size="lg"
        variant="sheet"
        dismissible={false}
      >
        {a.editing && (
          <EventForm
            key={a.editing.mode === "edit" ? a.editing.event.id : "new"}
            initial={a.editing.mode === "edit" ? a.editing.event : null}
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
        onConfirm={a.confirmDelete}
        onCancel={a.cancelDelete}
      />

      <ConfirmDialog
        open={resetting}
        title="기본 이벤트로 되돌리기"
        message={<>등록 · 수정 · 삭제한 내용을 모두 지우고 처음 이벤트 목록으로 되돌릴까요? (Mock 전용 — 이 브라우저의 저장값만 지워요)</>}
        confirmLabel="되돌리기"
        onConfirm={confirmReset}
        onCancel={() => setResetting(false)}
      />

      <AdminToast toast={a.toast} />
    </>
  );
}
