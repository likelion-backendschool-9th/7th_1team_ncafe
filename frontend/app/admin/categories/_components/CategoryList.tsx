"use client";

import type { Category, Menu } from "@/app/(site)/menu/_types";
import Modal from "@/components/Modal";
import AdminToast from "../../_components/AdminToast";
import ConfirmDialog from "../../_components/ConfirmDialog";
import styles from "../../_components/admin.module.css";
import { useCategoryAdmin } from "../_hooks/useCategoryAdmin";
import CategoryForm from "./CategoryForm";

interface CategoryListProps {
  initialCategories: Category[];
  menus: Menu[];
}

const moveBtnId = (id: number, dir: -1 | 1) => `cat-${id}-${dir === -1 ? "up" : "down"}`;

/** 카테고리 관리 화면 — 순서 · 노출 · 메뉴 수 · 추가/수정/삭제 */
export default function CategoryList({ initialCategories, menus }: CategoryListProps) {
  const a = useCategoryAdmin(initialCategories, menus);
  const last = a.categories.length - 1;

  // 순서를 바꾼 뒤에도 같은 행의 이동 버튼에 포커스를 유지한다(키보드 연속 이동).
  async function handleMove(id: number, dir: -1 | 1) {
    const moved = await a.move(id, dir);
    if (!moved) return;
    requestAnimationFrame(() => {
      const same = document.getElementById(moveBtnId(id, dir)) as HTMLButtonElement | null;
      const other = document.getElementById(moveBtnId(id, dir === -1 ? 1 : -1)) as HTMLButtonElement | null;
      (same && !same.disabled ? same : other)?.focus();
    });
  }

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <span className="eyebrow">Category Management</span>
          <h1 className={styles.pageTitle}>카테고리 관리</h1>
          <p className="subtitle">
            메뉴판 탭의 순서와 노출을 관리합니다. 전체 {a.categories.length}개 · 노출{" "}
            {a.categories.filter((c) => c.visible).length}개
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={a.openCreate}>
          + 카테고리 추가
        </button>
      </header>

      {a.categories.length === 0 ? (
        <div className={styles.empty}>
          <p>등록된 카테고리가 없습니다.</p>
          <button type="button" className="btn btn-sm" onClick={a.openCreate}>
            첫 카테고리 추가하기
          </button>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">순서</th>
              <th scope="col">이름 (영문)</th>
              <th scope="col" className={styles.num}>
                메뉴 수
              </th>
              <th scope="col">메뉴판 노출</th>
              <th scope="col">
                <span className="visually-hidden">관리</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {a.categories.map((c, i) => {
              const count = a.countOf(c.id);
              return (
                <tr key={c.id} className={c.visible ? undefined : styles.rowMuted}>
                  <td data-label="순서">
                    <div className={styles.orderCell}>
                      <span className={`${styles.orderNo} font-board`}>{i + 1}</span>
                      <button
                        type="button"
                        id={moveBtnId(c.id, -1)}
                        className={styles.iconBtn}
                        onClick={() => handleMove(c.id, -1)}
                        disabled={i === 0}
                        aria-label={`${c.name} 위로 이동`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        id={moveBtnId(c.id, 1)}
                        className={styles.iconBtn}
                        onClick={() => handleMove(c.id, 1)}
                        disabled={i === last}
                        aria-label={`${c.name} 아래로 이동`}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td data-label="이름" className={styles.cellName}>
                    <div className={styles.nameBlock}>
                      <strong>{c.name}</strong>
                      <span>{c.engName}</span>
                    </div>
                  </td>
                  <td data-label="메뉴 수" className={`${styles.num} font-board`}>
                    {count}
                  </td>
                  <td data-label="노출">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.visible}
                      aria-label={`${c.name} 메뉴판 노출`}
                      className={styles.switch}
                      onClick={() => a.toggleVisible(c)}
                    >
                      <span className={styles.switchKnob} aria-hidden />
                      <span className={styles.switchText}>{c.visible ? "ON" : "OFF"}</span>
                    </button>
                  </td>
                  <td className={styles.cellActions}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => a.openEdit(c)}>
                      수정<span className="visually-hidden"> {c.name}</span>
                    </button>
                    {count > 0 ? (
                      <span className={styles.blocked}>메뉴를 먼저 옮기거나 삭제해 주세요</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-sm ${styles.btnDangerOutline}`}
                        onClick={() => a.askDelete(c)}
                      >
                        삭제<span className="visually-hidden"> {c.name}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className={styles.note}>
        노출을 끄면 손님용 메뉴판(/menu) 탭에서 숨겨집니다. 메뉴가 속한 카테고리는 삭제할 수 없습니다.
      </p>

      <Modal
        open={a.editing !== null}
        onClose={a.closeForm}
        label={a.editing?.mode === "edit" ? "카테고리 수정" : "카테고리 추가"}
        size="sm"
        variant="sheet"
        dismissible={false}
      >
        {a.editing && (
          <CategoryForm
            key={a.editing.mode === "edit" ? a.editing.category.id : "new"}
            initial={a.editing.mode === "edit" ? a.editing.category : null}
            errors={a.errors}
            busy={a.busy}
            onSubmit={a.save}
            onCancel={a.closeForm}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={a.deleting !== null}
        title="카테고리 삭제"
        message={
          <>
            <strong>{a.deleting?.name}</strong> 카테고리를 삭제할까요? 삭제한 카테고리는 되돌릴 수 없습니다.
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
