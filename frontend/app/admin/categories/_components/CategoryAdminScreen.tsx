"use client";

import { useEffect, useState } from "react";
import type { Category, Menu } from "@/app/(site)/menu/_types";
import styles from "../../_components/admin.module.css";
import { getAdminCategories, getAdminMenus } from "../../menus/_lib/menuAdminService";
import CategoryList from "./CategoryList";

/**
 * 카테고리 관리 데이터를 브라우저에서 받는다 — 관리자 API 는 로그인 세션이 필요해 서버 렌더에서 부르지 않는다.
 * 메뉴 목록은 카테고리별 메뉴 수(남아 있으면 삭제 불가)를 세는 데 쓴다.
 */
export default function CategoryAdminScreen() {
  const [data, setData] = useState<{ categories: Category[]; menus: Menu[] } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([getAdminCategories(), getAdminMenus()])
      .then(([categories, menus]) => !ignore && setData({ categories, menus }))
      .catch((e: unknown) => !ignore && setError(e instanceof Error ? e.message : "카테고리를 불러오지 못했습니다."));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <div className={styles.empty} role="alert">
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setError("");
            setAttempt((n) => n + 1);
          }}
        >
          다시 불러오기
        </button>
      </div>
    );
  }
  if (!data) return <p role="status">카테고리를 불러오고 있습니다…</p>;

  return <CategoryList initialCategories={data.categories} menus={data.menus} />;
}
