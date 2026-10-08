"use client";

import { useRef, type KeyboardEvent } from "react";
import styles from "./menu.module.css";

export interface CategoryTab {
  /** null = 전체 */
  id: number | null;
  label: string;
  count: number;
}

interface MenuCategoryProps {
  tabs: CategoryTab[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  /** 탭·패널 id 를 만들 접두어 */
  idBase: string;
  panelId: string;
}

export const tabId = (idBase: string, id: number | null) => `${idBase}-tab-${id ?? "all"}`;

/**
 * 카테고리 탭(전체 + 노출 카테고리). WAI-ARIA Tabs 패턴 — 선택된 탭만 Tab 키로 들어오고,
 * ←/→ · Home/End 로 옮기면 바로 선택된다(자동 활성화).
 */
export default function MenuCategory({ tabs, selected, onSelect, idBase, panelId }: MenuCategoryProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onSelect(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={`scroll-x ${styles.tabsScroll}`}>
      <div role="tablist" aria-label="메뉴 카테고리" className={styles.tabs}>
        {tabs.map((tab, i) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id ?? "all"}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(idBase, tab.id)}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
