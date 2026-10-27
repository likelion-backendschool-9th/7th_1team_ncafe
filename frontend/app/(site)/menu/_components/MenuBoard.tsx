"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { Branch } from "../../seat/_types";
import { matchesMenu, normalizeQuery } from "../_lib/menuSearch";
import { useMyGrade } from "../_hooks/useMyGrade";
import { lockOf } from "../_lib/gradeService";
import { getMenuStatuses } from "../_lib/menuService";
import type { Category, Menu, MenuStatus } from "../_types";
import MenuBranchPicker from "./MenuBranchPicker";
import MenuCard from "./MenuCard";
import MenuCategory, { tabId, type CategoryTab } from "./MenuCategory";
import MenuSearch from "./MenuSearch";
import styles from "./menu.module.css";

interface MenuBoardProps {
  /** selectBoard() 를 거친 노출 카테고리(order 순) */
  categories: Category[];
  /** selectBoard() 를 거친 노출 메뉴 */
  menus: Menu[];
  /** 메뉴판 지점 선택 칩. 첫 번째가 기본 지점 */
  branches: Branch[];
  /** 페이지 제목(서버에서 렌더) — PC 에서는 검색창과 한 줄에 놓인다 */
  children: ReactNode;
}

/**
 * 검색창 + 카테고리 탭 + 티켓 그리드. 검색어와 선택한 탭은 이 컴포넌트의 State 로만 들고 있다.
 * 검색은 탭과 함께 적용되고, 탭의 개수도 검색 결과 기준으로 바뀐다.
 * 상세로 갔다가 돌아오면 Next 가 페이지를 숨겨 두었다 다시 보여 주므로(cacheComponents 의 Activity) 둘 다 남아 있다.
 *
 * 판매 상태는 지점별이다. 메뉴 목록은 정적 셸에 그대로 두고, 화면이 뜬 뒤 고른 지점의 상태만 받아 덮어쓴다
 * (그 지점에서 숨긴 메뉴는 빼고, 품절은 카드에 "품절"로 보인다). 받기 전이나 실패하면 전부 판매 중으로 보인다.
 */
export default function MenuBoard({ categories, menus, branches, children }: MenuBoardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [loaded, setLoaded] = useState<{ branchId: string; statuses: Map<number, MenuStatus> | null } | null>(null);
  const { minTotal } = useMyGrade();
  const idBase = useId();
  const panelId = `${idBase}-panel`;
  const searchId = `${idBase}-search`;

  useEffect(() => {
    if (!branchId) return;
    let ignore = false; // 지점을 빠르게 바꾸면 늦게 온 이전 응답은 버린다
    getMenuStatuses(branchId)
      .then((statuses) => !ignore && setLoaded({ branchId, statuses }))
      .catch(() => !ignore && setLoaded({ branchId, statuses: null }));
    return () => {
      ignore = true;
    };
  }, [branchId]);

  const current = loaded?.branchId === branchId ? loaded : null;
  const statuses = current?.statuses ?? null;
  const branchMenus = statuses
    ? menus.filter((m) => statuses.has(m.id)).map((m) => ({ ...m, status: statuses.get(m.id)! }))
    : menus;

  const q = normalizeQuery(query);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const found = branchMenus.filter((m) => matchesMenu(m, q, categoryById.get(m.categoryId)));

  const tabs: CategoryTab[] = [
    { id: null, label: "전체", count: found.length },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name,
      count: found.filter((m) => m.categoryId === c.id).length,
    })),
  ];
  const shown = selected === null ? found : found.filter((m) => m.categoryId === selected);
  const currentTab = tabs.find((t) => t.id === selected);
  const keyword = `‘${query.trim()}’`;

  const showAll = () => {
    setSelected(null);
    document.getElementById(tabId(idBase, null))?.focus();
  };
  const clearQuery = () => {
    setQuery("");
    document.getElementById(searchId)?.focus();
  };

  return (
    <>
      <div className={styles.top}>
        {children}
        <MenuSearch id={searchId} value={query} onChange={setQuery} />
      </div>

      {branches.length > 0 && (
        <div className={styles.branchRow}>
          <MenuBranchPicker branches={branches} selected={branchId} onSelect={setBranchId} />
          {current && !current.statuses && (
            <p className={styles.branchNote} role="status">
              이 지점의 품절 정보를 불러오지 못했어요. 모든 메뉴를 판매 중으로 보여 드려요.
            </p>
          )}
        </div>
      )}

      <MenuCategory tabs={tabs} selected={selected} onSelect={setSelected} idBase={idBase} panelId={panelId} />

      <div id={panelId} role="tabpanel" aria-labelledby={tabId(idBase, selected)} className={styles.panel}>
        <p className={styles.result} aria-live="polite">
          {q && <span className={styles.resultQuery}>{keyword} 검색 · </span>}
          {currentTab?.label} <strong>{shown.length}</strong>개
        </p>

        {shown.length > 0 ? (
          <ul className={styles.grid}>
            {shown.map((menu) => (
              <li key={menu.id}>
                <MenuCard menu={menu} lockedBy={lockOf(menu, minTotal)} />
              </li>
            ))}
          </ul>
        ) : !q ? (
          <div className={styles.empty}>
            <p>이 카테고리에는 아직 출전한 메뉴가 없어요.</p>
          </div>
        ) : selected !== null && found.length > 0 ? (
          <div className={styles.empty}>
            <p>
              {currentTab?.label}에는 {keyword}에 맞는 메뉴가 없어요. 다른 카테고리에 <strong>{found.length}</strong>개 있어요.
            </p>
            <button type="button" className="btn btn-outline btn-sm" onClick={showAll}>
              전체에서 보기
            </button>
          </div>
        ) : (
          <div className={styles.empty}>
            <p>
              {keyword}에 맞는 메뉴가 없어요. 이름 · 영문명이나 초성(ㅇㅁㄹ)으로 다시 찾아보세요.
            </p>
            <button type="button" className="btn btn-outline btn-sm" onClick={clearQuery}>
              검색어 지우기
            </button>
          </div>
        )}
      </div>
    </>
  );
}
