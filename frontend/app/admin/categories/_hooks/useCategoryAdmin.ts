"use client";

import { useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "@/app/(site)/menu/_lib/menuService";
import type { Category, CategoryInput, Menu } from "@/app/(site)/menu/_types";
import { useToast } from "../../_components/AdminToast";
import { validateCategory, type CategoryErrors } from "../_lib/validateCategory";

export type CategoryEditing = { mode: "create" } | { mode: "edit"; category: Category } | null;

const byOrder = (a: Category, b: Category) => a.order - b.order;

/** 카테고리 관리 — 목록 State + 추가/수정/삭제/순서/노출 */
export function useCategoryAdmin(initialCategories: Category[], menus: Menu[]) {
  const [categories, setCategories] = useState(() => [...initialCategories].sort(byOrder));
  const [editing, setEditing] = useState<CategoryEditing>(null);
  const [errors, setErrors] = useState<CategoryErrors>({});
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  /** 카테고리별 메뉴 수 */
  const menuCount = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of menus) map.set(m.categoryId, (map.get(m.categoryId) ?? 0) + 1);
    return map;
  }, [menus]);

  const countOf = (id: number) => menuCount.get(id) ?? 0;

  function openCreate() {
    setErrors({});
    setEditing({ mode: "create" });
  }

  function openEdit(category: Category) {
    setErrors({});
    setEditing({ mode: "edit", category });
  }

  function closeForm() {
    setEditing(null);
    setErrors({});
  }

  async function save(input: CategoryInput) {
    if (!editing || busy) return;
    const editingId = editing.mode === "edit" ? editing.category.id : null;
    const errs = validateCategory(input, { categories, editingId });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const clean: CategoryInput = { ...input, name: input.name.trim(), engName: input.engName.trim() };
    setBusy(true);
    try {
      if (editing.mode === "create") {
        const order = categories.reduce((max, c) => Math.max(max, c.order), 0) + 1;
        const created = await createCategory(clean, order);
        setCategories((prev) => [...prev, created].sort(byOrder));
        show(`"${created.name}" 카테고리를 추가했습니다.`);
      } else {
        const updated = await updateCategory(editing.category.id, clean, editing.category.order);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        show(`"${updated.name}" 카테고리를 저장했습니다.`);
      }
      closeForm();
    } catch {
      show("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  /** 한 칸 위(-1) / 아래(+1)로 이동. 성공하면 true */
  async function move(id: number, dir: -1 | 1): Promise<boolean> {
    const index = categories.findIndex((c) => c.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= categories.length) return false;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorderCategories(next.map((c) => c.id));
      setCategories(next.map((c, i) => ({ ...c, order: i + 1 })));
      return true;
    } catch {
      show("순서를 바꾸지 못했습니다.", "error");
      return false;
    }
  }

  async function toggleVisible(category: Category) {
    const visible = !category.visible;
    try {
      const updated = await updateCategory(
        category.id,
        { name: category.name, engName: category.engName, visible },
        category.order,
      );
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      show(`"${category.name}" 카테고리를 메뉴판에서 ${visible ? "보이게" : "숨기게"} 했습니다.`);
    } catch {
      show("노출 설정을 바꾸지 못했습니다.", "error");
    }
  }

  function askDelete(category: Category) {
    if (countOf(category.id) > 0) return; // 메뉴가 남아 있으면 삭제 불가
    setDeleting(category);
  }

  async function confirmDelete() {
    if (!deleting || busy) return;
    const target = deleting;
    setBusy(true);
    try {
      await deleteCategory(target.id);
      setCategories((prev) => prev.filter((c) => c.id !== target.id).map((c, i) => ({ ...c, order: i + 1 })));
      setDeleting(null);
      show(`"${target.name}" 카테고리를 삭제했습니다.`);
    } catch {
      show("삭제하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  }

  return {
    categories,
    countOf,
    editing,
    errors,
    busy,
    openCreate,
    openEdit,
    closeForm,
    save,
    move,
    toggleVisible,
    deleting,
    askDelete,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    toast,
  };
}
