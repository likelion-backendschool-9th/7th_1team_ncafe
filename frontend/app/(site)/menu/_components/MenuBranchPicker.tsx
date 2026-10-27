"use client";

import type { Branch } from "../../seat/_types";
import styles from "./menu.module.css";

interface MenuBranchPickerProps {
  branches: Branch[];
  selected: string;
  onSelect: (id: string) => void;
}

/**
 * 메뉴판 지점 선택 — 고른 지점의 품절 · 숨김이 메뉴판에 반영된다.
 * 임시로 메뉴판 안에서만 고른다(헤더 공통 지점 선택은 팀과 조율 후).
 */
export default function MenuBranchPicker({ branches, selected, onSelect }: MenuBranchPickerProps) {
  return (
    <div className={styles.branches} role="group" aria-label="이용할 지점">
      <span className={styles.branchLabel}>지점</span>
      {branches.map((b) => (
        <button
          key={b.id}
          type="button"
          className={styles.branchBtn}
          aria-pressed={b.id === selected}
          onClick={() => b.id !== selected && onSelect(b.id)}
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}
