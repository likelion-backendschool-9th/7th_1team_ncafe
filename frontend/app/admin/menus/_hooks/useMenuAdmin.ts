"use client";

import { useMemo, useState } from "react";
import { createMenu, deleteMenu, updateMenu, updateMenuStatus } from "@/app/(site)/menu/_lib/menuService";
import type { Category, Menu, MenuInput, MenuStatus } from "@/app/(site)/menu/_types";
import { useToast } from "../../_components/AdminToast";
import { hasErrors, validateMenu, type MenuErrors } from "../_lib/validateMenu";

export type MenuEditing = { mode: "create" } | { mode: "edit"; menu: Menu } | null;
export type CategoryFilter = number | "ALL";
export type StatusFilter = MenuStatus | "ALL";

/** 메뉴 관리 — 목록 State + 검색·필터 + 등록/수정/삭제/상태 변경 */
export function useMenuAdmin(initialMenus: Menu[], categories: Category[]) {
  const [menus, setMenus] = useState(initialMenus);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [editing, setEditing] = useState<MenuEditing>(null);
  const [errors, setErrors] = useState<MenuErrors>({});
  const [deleting, setDeleting] = useState<Menu | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menus.filter(
      (m) =>
        (categoryFilter === "ALL" || m.categoryId === categoryFilter) &&
        (statusFilter === "ALL" || m.status === statusFilter) &&
        (!q || m.name.toLowerCase().includes(q) || m.engName.toLowerCase().includes(q)),
    );
  }, [menus, query, categoryFilter, statusFilter]);

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
    } catch {
      show("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
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
    } catch {
      show("삭제하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(menu: Menu, status: MenuStatus) {
    if (menu.status === status) return;
    try {
      await updateMenuStatus(menu.id, status);
      setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, status } : m)));
      show(`"${menu.name}" 상태를 변경했습니다.`);
    } catch {
      show("상태를 바꾸지 못했습니다.", "error");
    }
  }

  return {
    menus,
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
