"use client";

import Image from "next/image";
import type { Category, GradeInfo, Menu, MenuStatus } from "@/app/(site)/menu/_types";
import type { Branch } from "@/app/(site)/seat/_types";
import Modal from "@/components/Modal";
import TicketBadge from "@/components/TicketBadge";
import AdminToast from "../../_components/AdminToast";
import ConfirmDialog from "../../_components/ConfirmDialog";
import styles from "../../_components/admin.module.css";
import { useMenuAdmin, type CategoryFilter, type StatusFilter } from "../_hooks/useMenuAdmin";
import MenuForm from "./MenuForm";

export const STATUS_OPTIONS: { value: MenuStatus; label: string }[] = [
  { value: "ON_SALE", label: "판매중" },
  { value: "SOLD_OUT", label: "품절" },
  { value: "HIDDEN", label: "숨김" },
];

interface MenuAdminTableProps {
  initialMenus: Menu[];
  categories: Category[];
  /** 판매 상태를 관리할 지점(첫 번째가 기본) */
  branches: Branch[];
  /** 해금 등급 선택지 */
  grades: GradeInfo[];
  imageOptions: { path: string; label: string }[];
}

/** 메뉴 관리 화면 — 검색·필터 + 목록 표 + 등록/수정 폼 + 삭제 확인. 상태 칸은 고른 지점의 판매 상태다. */
export default function MenuAdminTable({ initialMenus, categories, branches, grades, imageOptions }: MenuAdminTableProps) {
  const a = useMenuAdmin(initialMenus, categories, branches);
  const statusReady = branches.length > 0 && !a.statusLoading && !a.statusError;
  const branchName = branches.find((b) => b.id === a.branchId)?.name;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const filtering = a.query !== "" || a.categoryFilter !== "ALL" || a.statusFilter !== "ALL";

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <span className="eyebrow">Menu Management</span>
          <h1 className={styles.pageTitle}>메뉴 관리</h1>
          <p className="subtitle">
            전체 {a.menus.length}개
            {statusReady && ` · ${branchName} 판매중 ${a.menus.filter((m) => m.status === "ON_SALE").length}개`}
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={a.openCreate}>
          + 메뉴 등록
        </button>
      </header>

      <div className={styles.toolbar} role="search">
        <label className={styles.toolField}>
          <span className={styles.label}>판매 상태 지점</span>
          <select
            className={styles.input}
            value={a.branchId}
            disabled={branches.length === 0}
            onChange={(e) => a.setBranchId(e.target.value)}
          >
            {branches.length === 0 && <option value="">등록된 지점 없음</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.toolField}>
          <span className={styles.label}>검색</span>
          <input
            type="search"
            className={styles.input}
            placeholder="이름 또는 영문명"
            value={a.query}
            onChange={(e) => a.setQuery(e.target.value)}
          />
        </label>
        <label className={styles.toolField}>
          <span className={styles.label}>카테고리</span>
          <select
            className={styles.input}
            value={String(a.categoryFilter)}
            onChange={(e) => a.setCategoryFilter((e.target.value === "ALL" ? "ALL" : Number(e.target.value)) as CategoryFilter)}
          >
            <option value="ALL">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.toolField}>
          <span className={styles.label}>상태</span>
          <select
            className={styles.input}
            value={a.statusFilter}
            onChange={(e) => a.setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">전체</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {filtering && (
          <button type="button" className="btn btn-outline btn-sm" onClick={a.resetFilters}>
            필터 초기화
          </button>
        )}
      </div>

      {branches.length === 0 ? (
        <p className={styles.resultCount} role="note">
          판매 상태는 지점별로 관리합니다. 지점 관리에서 지점을 먼저 등록하세요.
        </p>
      ) : a.statusError ? (
        <p className={styles.resultCount} role="alert">
          {branchName}의 판매 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}

      <p className={styles.resultCount} aria-live="polite">
        {filtering ? `검색 결과 ${a.filtered.length}개` : `${a.filtered.length}개 메뉴`}
      </p>

      {a.filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>{filtering ? "조건에 맞는 메뉴가 없습니다." : "등록된 메뉴가 없습니다."}</p>
          {filtering ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={a.resetFilters}>
              필터 초기화
            </button>
          ) : (
            <button type="button" className="btn btn-sm" onClick={a.openCreate}>
              첫 메뉴 등록하기
            </button>
          )}
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">이미지</th>
              <th scope="col">이름 / 영문명</th>
              <th scope="col">카테고리</th>
              <th scope="col" className={styles.num}>
                가격
              </th>
              <th scope="col">배지</th>
              <th scope="col">상태</th>
              <th scope="col">
                <span className="visually-hidden">관리</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {a.filtered.map((m) => (
              <tr key={m.id} className={m.status === "HIDDEN" ? styles.rowMuted : undefined}>
                <td className={styles.cellImage}>
                  <Image src={m.image} alt="" width={48} height={48} unoptimized className={styles.thumb} />
                </td>
                <td data-label="이름" className={styles.cellName}>
                  <div className={styles.nameBlock}>
                    <strong>{m.name}</strong>
                    <span>{m.engName}</span>
                    {m.requiredGrade && <span>해금: {m.requiredGrade.name}부터</span>}
                  </div>
                </td>
                <td data-label="카테고리">{categoryName.get(m.categoryId) ?? "(삭제된 카테고리)"}</td>
                <td data-label="가격" className={`${styles.num} font-board`}>
                  {m.sizePrices ? (
                    <>
                      {m.sizePrices.S.toLocaleString("ko-KR")}~{m.sizePrices.XL.toLocaleString("ko-KR")}원
                      <span className={styles.priceSizes}>S–XL</span>
                    </>
                  ) : (
                    `${m.price.toLocaleString("ko-KR")}원`
                  )}
                </td>
                <td data-label="배지">{m.badge ? <TicketBadge tone={m.badge} /> : <span className={styles.dash}>—</span>}</td>
                <td data-label="상태">
                  <select
                    className={`${styles.input} ${styles.statusSelect} ${styles[`status_${m.status}`]}`}
                    value={m.status}
                    disabled={!statusReady}
                    aria-label={`${branchName ?? ""} ${m.name} 상태`}
                    onChange={(e) => a.changeStatus(m, e.target.value as MenuStatus)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={styles.cellActions}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => a.openEdit(m)}>
                    수정<span className="visually-hidden"> {m.name}</span>
                  </button>
                  <button type="button" className={`btn btn-sm ${styles.btnDangerOutline}`} onClick={() => a.askDelete(m)}>
                    삭제<span className="visually-hidden"> {m.name}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={a.editing !== null}
        onClose={a.closeForm}
        label={a.editing?.mode === "edit" ? "메뉴 수정" : "메뉴 등록"}
        size="lg"
        variant="sheet"
        dismissible={false}
      >
        {a.editing && (
          <MenuForm
            key={a.editing.mode === "edit" ? a.editing.menu.id : "new"}
            initial={a.editing.mode === "edit" ? a.editing.menu : null}
            categories={categories}
            grades={grades}
            imageOptions={imageOptions}
            errors={a.errors}
            busy={a.busy}
            onSubmit={a.save}
            onCancel={a.closeForm}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={a.deleting !== null}
        title="메뉴 삭제"
        message={
          <>
            <strong>{a.deleting?.name}</strong> 메뉴를 삭제할까요?
            <br />
            모든 지점의 메뉴판에서 사라지고 되돌릴 수 없습니다. 한 지점에서만 잠시 내리려면 그 지점의 상태를 <strong>숨김</strong>으로 바꾸세요.
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
