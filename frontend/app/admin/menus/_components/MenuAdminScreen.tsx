"use client";

import { useEffect, useState } from "react";
import type { Category, Menu } from "@/app/(site)/menu/_types";
import type { Branch } from "@/app/(site)/seat/_types";
import styles from "../../_components/admin.module.css";
import { getAdminCategories, getAdminMenus, getBranches } from "../_lib/menuAdminService";
import MenuAdminTable from "./MenuAdminTable";

type Loaded = { menus: Menu[]; categories: Category[]; branches: Branch[] };

/**
 * 메뉴 관리 데이터를 브라우저에서 받는다 — 관리자 API 는 로그인 세션이 필요해 서버 렌더에서 부르지 않는다.
 * 받는 동안 · 실패하면 안내를 보이고, 다 받으면 표를 그린다.
 */
export default function MenuAdminScreen({ imageOptions }: { imageOptions: { path: string; label: string }[] }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([getAdminMenus(), getAdminCategories(), getBranches()])
      .then(([menus, categories, branches]) => !ignore && setData({ menus, categories, branches }))
      .catch((e: unknown) => !ignore && setError(e instanceof Error ? e.message : "메뉴를 불러오지 못했습니다."));
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
  if (!data) return <p role="status">메뉴를 불러오고 있습니다…</p>;

  return (
    <MenuAdminTable
      initialMenus={data.menus}
      categories={data.categories}
      branches={data.branches}
      imageOptions={imageOptions}
    />
  );
}
