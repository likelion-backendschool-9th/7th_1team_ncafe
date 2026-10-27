"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminEvents } from "@/app/(site)/event/_hooks/useEvents";
import {
  branchName,
  crowdedOf,
  EVENT_STATUS_LABEL,
  EVENT_STATUSES,
  EVENT_TYPE_LABEL,
  eventStatus,
  formatEventPeriod,
  isFull,
  isShownOnSite,
  statusHint,
} from "@/app/(site)/event/_lib/eventStatus";
import { adminEventsStore } from "@/app/(site)/event/_lib/eventStore";
import type { CafeEvent, EventStatus } from "@/app/(site)/event/_types";
import { BRANCHES } from "@/app/(site)/seat/_data/branches";
import Modal from "@/components/Modal";
import { useKstToday } from "@/lib/useCountdown";
import adminStyles from "../../_components/admin.module.css";
import AdminToast from "../../_components/AdminToast";
import ConfirmDialog from "../../_components/ConfirmDialog";
import { useEventEditor } from "../_hooks/useEventEditor";
import { SiteBadge, StatusBadges } from "./EventBadges";
import EventForm from "./EventForm";
import styles from "./eventAdmin.module.css";

type StatusFilter = EventStatus | "ALL";
type SiteFilter = "ALL" | "SHOWN" | "HIDDEN";
type TypeFilter = "ALL" | "COUPON" | "JOIN";

/**
 * 이벤트 관리 목록 — 검색 · 지점 · 종류 · 상태 · 손님 화면 노출로 거르고, 표에서 노출 허가를 바로 켜고 끈다. 이름을 누르면 상세(/admin/event/[id]).
 * 신청 칸은 신청 인원만 보여 준다 — 쿠폰 지급(선착순)은 참여 인원 / 마감 인원, 일반 참여는 신청 기록 수.
 * 목록은 서버 값(GET /api/v1/admin/events — ADMIN 로그인 필요)이고, 상태는 오늘 날짜(KST)로 계산하므로 시계를 읽고 목록을 받은 뒤에 그린다.
 */
export default function EventAdminList() {
  const { data: events, loaded, error } = useAdminEvents();
  const today = useKstToday();
  const a = useEventEditor(events);
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [siteFilter, setSiteFilter] = useState<SiteFilter>("ALL");

  // 들어올 때마다(로그인한 뒤 포함) 새로 불러온다
  useEffect(() => {
    void adminEventsStore.refresh();
  }, []);

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

  if (error) {
    return (
      <>
        {head}
        <AdminEventsError status={error.status} message={error.message} next="/admin/event" />
      </>
    );
  }

  if (today === null || !loaded) {
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
  const filtering = q !== "" || branchFilter !== "ALL" || typeFilter !== "ALL" || statusFilter !== "ALL" || siteFilter !== "ALL";
  const filtered = events.filter((e) => {
    const shown = isShownOnSite(e, today);
    return (
      (branchFilter === "ALL" || e.branchId === branchFilter) &&
      (typeFilter === "ALL" || (typeFilter === "COUPON") === e.coupon) &&
      (statusFilter === "ALL" || eventStatus(e, today) === statusFilter) &&
      (siteFilter === "ALL" || (siteFilter === "SHOWN") === shown) &&
      (!q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || branchName(e.branchId).includes(q))
    );
  });
  const resetFilters = () => {
    setQuery("");
    setBranchFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setSiteFilter("ALL");
  };

  return (
    <>
      {head}

      <div className={adminStyles.toolbar} role="search">
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>검색</span>
          <input
            type="search"
            className={adminStyles.input}
            placeholder="이름 · 설명 · 지점"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>지점</span>
          <select className={adminStyles.input} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="ALL">전체</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={adminStyles.toolField}>
          <span className={adminStyles.label}>종류</span>
          <select className={adminStyles.input} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="ALL">전체</option>
            <option value="COUPON">{EVENT_TYPE_LABEL.COUPON}</option>
            <option value="JOIN">{EVENT_TYPE_LABEL.JOIN}</option>
          </select>
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
              <th scope="col">지점</th>
              <th scope="col">이벤트</th>
              <th scope="col">기간</th>
              <th scope="col">신청</th>
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
              return (
                <tr key={e.id} className={shown ? undefined : adminStyles.rowMuted}>
                  <td data-label="No." className={styles.serial}>
                    {String(e.id).padStart(2, "0")}
                  </td>
                  <td data-label="지점">{branchName(e.branchId)}</td>
                  <td data-label="이벤트" className={adminStyles.cellName}>
                    <div className={adminStyles.nameBlock}>
                      <Link href={`/admin/event/${e.id}`} className={styles.titleLink}>
                        {e.title}
                      </Link>
                      <TypeText event={e} />
                    </div>
                  </td>
                  <td data-label="기간" className={styles.period}>
                    {formatEventPeriod(e)}
                  </td>
                  <td data-label="신청">
                    <AppliesText event={e} />
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
          손님 화면(/event)에는 진행 중인 이벤트와 노출 허가를 켠 이벤트만 보여요. 신청자가 있는 이벤트는 삭제할 수 없고, 종류 · 지급 쿠폰 수도 바꿀 수 없어요.
        </p>
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

      <AdminToast toast={a.toast} />
    </>
  );
}

/** 종류 — "쿠폰 지급 · 2장" / "일반 참여" */
function TypeText({ event }: { event: CafeEvent }) {
  return event.coupon ? (
    <span className={styles.typeCoupon}>
      {EVENT_TYPE_LABEL.COUPON} · {event.couponAmount}장
    </span>
  ) : (
    <span className={styles.typeJoin}>{EVENT_TYPE_LABEL.JOIN}</span>
  );
}

/** 신청 인원 — 쿠폰 지급(선착순)은 참여 인원 / 마감 인원 "12 / 30명"(마감이면 "선착순 마감"), 일반 참여는 신청 기록 수 "8명" */
function AppliesText({ event }: { event: CafeEvent }) {
  return (
    <span className={styles.applies}>
      {event.coupon ? `${crowdedOf(event)} / ${event.capacity}명` : `${event.applyCount}명`}
      {isFull(event) && <span className={styles.appliesFull}>선착순 마감</span>}
    </span>
  );
}

/** 관리자 목록을 못 받았을 때 — 로그인이 필요하면(401 · 403) 로그인 안내, 그 밖에는 오류 문구. 상세 화면도 쓴다 */
export function AdminEventsError({ status, message, next }: { status: number; message: string; next: string }) {
  const needLogin = status === 401 || status === 403;
  return (
    <div className={adminStyles.empty}>
      <p>{needLogin ? "관리자 계정으로 로그인해야 이벤트를 관리할 수 있어요." : `이벤트를 불러오지 못했어요 — ${message}`}</p>
      {needLogin && (
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-outline btn-sm">
          로그인
        </Link>
      )}
    </div>
  );
}
