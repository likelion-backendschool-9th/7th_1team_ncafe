"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Menu, MenuInput, MenuStatus } from "@/app/(site)/menu/_types";
import type { Branch } from "@/app/(site)/seat/_types";
import { useToast } from "../../_components/AdminToast";
import {
  createMenu,
  deleteMenu,
  getBranchMenuStatuses,
  updateBranchMenuStatus,
  updateMenu,
} from "../_lib/menuAdminService";
import { hasErrors, validateMenu, type MenuErrors } from "../_lib/validateMenu";

export type MenuEditing = { mode: "create" } | { mode: "edit"; menu: Menu } | null;
export type CategoryFilter = number | "ALL";
export type StatusFilter = MenuStatus | "ALL";

/** 서버가 준 오류 메시지(예: "WINNER 라벨은 한 메뉴에만…")를 그대로 보여 준다 */
const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/**
 * 메뉴 관리 — 목록 State + 검색·필터 + 등록/수정/삭제 + 지점별 판매 상태.
 * 메뉴 자체는 본사 공통이고, 판매 상태는 고른 지점의 값이다(상태 행이 없는 메뉴는 판매 중).
 */
export function useMenuAdmin(initialMenus: Menu[], categories: Category[], branches: Branch[]) {
  const [menus, setMenus] = useState(initialMenus);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [loaded, setLoaded] = useState<{ branchId: string; statuses: Map<number, MenuStatus> | null } | null>(null);

  const [editing, setEditing] = useState<MenuEditing>(null);
  const [errors, setErrors] = useState<MenuErrors>({});
  const [deleting, setDeleting] = useState<Menu | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    if (!branchId) return;
    let ignore = false; // 지점을 빠르게 바꾸면 늦게 온 이전 응답은 버린다
    getBranchMenuStatuses(branchId)
      .then((statuses) => !ignore && setLoaded({ branchId, statuses }))
      .catch(() => !ignore && setLoaded({ branchId, statuses: null }));
    return () => {
      ignore = true;
    };
  }, [branchId]);

  const current = loaded?.branchId === branchId ? loaded : null;
  const statusLoading = branchId !== "" && current === null;
  const statusError = current !== null && current.statuses === null;

  /** 고른 지점의 상태를 입힌 메뉴 목록 */
  const branchMenus = useMemo(() => {
    const statuses = current?.statuses;
    return statuses ? menus.map((m) => ({ ...m, status: statuses.get(m.id) ?? "ON_SALE" })) : menus;
  }, [menus, current]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branchMenus.filter(
      (m) =>
        (categoryFilter === "ALL" || m.categoryId === categoryFilter) &&
        (statusFilter === "ALL" || m.status === statusFilter) &&
        (!q || m.name.toLowerCase().includes(q) || m.engName.toLowerCase().includes(q)),
    );
  }, [branchMenus, query, categoryFilter, statusFilter]);

  function openCreate() {
    setErrors({});
    setEditing({ mode: "create" });
  }

  function openEdit(menu: Menu) {
    setErrors({});
    setEditing({ mode: "edit", menu });
  }

  function closeForm() {
    setEditing(null);
    setErrors({});
  }

  /** 저장 — 검증에 실패하면 errors 를 채우고 폼을 열어 둔다. */
  async function save(input: MenuInput) {
    if (!editing || busy) return;
    const editingId = editing.mode === "edit" ? editing.menu.id : null;
    const errs = validateMenu(input, { menus, categories, editingId });
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    const clean: MenuInput = {
      ...input,
      name: input.name.trim(),
      engName: input.engName.trim(),
      description: input.description.trim(),
    };
    setBusy(true);
    try {
      if (editingId === null) {
        const created = await createMenu(clean);
        setMenus((prev) => [...prev, created]);
        show(`"${created.name}" 메뉴를 등록했습니다.`);
      } else {
        const updated = await updateMenu(editingId, clean);
        setMenus((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        show(`"${updated.name}" 메뉴를 저장했습니다.`);
      }
      closeForm();
    } catch (error) {
      show(messageOf(error, "저장하지 못했습니다. 잠시 후 다시 시도해 주세요."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || busy) return;
    const target = deleting;
    setBusy(true);
    try {
      await deleteMenu(target.id);
      setMenus((prev) => prev.filter((m) => m.id !== target.id));
      setDeleting(null);
      show(`"${target.name}" 메뉴를 삭제했습니다.`);
    } catch (error) {
      show(messageOf(error, "삭제하지 못했습니다."), "error");
    } finally {
      setBusy(false);
    }
  }

  /** 고른 지점에서의 판매 상태를 바꾼다 */
  async function changeStatus(menu: Menu, status: MenuStatus) {
    if (menu.status === status || !branchId || !current?.statuses) return;
    const branchName = branches.find((b) => b.id === branchId)?.name ?? branchId;
    try {
      await updateBranchMenuStatus(branchId, menu.id, status);
      setLoaded((prev) => {
        if (!prev || prev.branchId !== branchId || !prev.statuses) return prev;
        return { branchId, statuses: new Map(prev.statuses).set(menu.id, status) };
      });
      show(`${branchName}에서 "${menu.name}" 상태를 변경했습니다.`);
    } catch (error) {
      show(messageOf(error, "상태를 바꾸지 못했습니다."), "error");
    }
  }

  return {
    menus: branchMenus,
    filtered,
    query,
    setQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    resetFilters: () => {
      setQuery("");
      setCategoryFilter("ALL");
      setStatusFilter("ALL");
    },
    branchId,
    setBranchId,
    statusLoading,
    statusError,
    editing,
    errors,
    busy,
    openCreate,
    openEdit,
    closeForm,
    save,
    deleting,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    changeStatus,
    toast,
  };
}
