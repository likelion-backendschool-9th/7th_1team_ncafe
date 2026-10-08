"use client";

import styles from "./menu.module.css";

interface MenuSearchProps {
  /** input id — 빈 상태의 "검색어 지우기" 가 포커스를 돌려줄 때 쓴다 */
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * 메뉴판 검색창 — 칠 때마다 바로 거른다(제출 버튼 없음). Esc 나 × 로 지운다.
 * 모바일 키보드의 "검색" 키는 키보드만 내린다.
 */
export default function MenuSearch({ id, value, onChange }: MenuSearchProps) {
  const clear = () => {
    onChange("");
    document.getElementById(id)?.focus();
  };

  return (
    <form
      role="search"
      className={styles.search}
      onSubmit={(e) => {
        e.preventDefault();
        document.getElementById(id)?.blur();
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        메뉴 검색
      </label>
      <SearchIcon />
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        placeholder="메뉴 이름, 영문명, 초성(ㅇㅁㄹ)"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
      />
      {value && (
        <button type="button" className={styles.searchClear} aria-label="검색어 지우기" onClick={clear}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="7.75" cy="7.75" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11.6 11.6 16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
