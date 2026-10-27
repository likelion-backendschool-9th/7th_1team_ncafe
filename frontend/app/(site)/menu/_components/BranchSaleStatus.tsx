"use client";

import { useBranchStatuses, useSelectedBranch } from "../_hooks/useMenuBranch";
import type { Menu, MenuStatus } from "../_types";
import styles from "./menuDetail.module.css";

const LABEL: Record<MenuStatus, string> = {
  ON_SALE: "판매 중",
  SOLD_OUT: "품절 — 오늘 준비한 수량이 모두 나갔어요",
  HIDDEN: "이 지점에서는 판매하지 않아요",
};

/**
 * 메뉴 상세의 "판매 상태" 값 — 고른 지점(메뉴판에서 고른 지점, 사이트 공통) 기준이고 지점 이름을 함께 보여 준다.
 * 상세 페이지는 모두에게 같은 내용으로 캐시하므로, 지점 상태는 화면이 뜬 뒤 브라우저에서 받아 바꾼다.
 */
export default function BranchSaleStatus({ menu }: { menu: Menu }) {
  const branch = useSelectedBranch();
  const { statuses } = useBranchStatuses(branch?.id ?? null);
  // 그 지점에서 숨긴 메뉴는 상태 목록에 없다
  const status: MenuStatus = statuses ? (statuses.get(menu.id) ?? "HIDDEN") : menu.status;

  return (
    <dd className={status === "ON_SALE" ? styles.factOnSale : styles.factSoldOut}>
      {LABEL[status]}
      {branch && <span className={styles.factEng}>{branch.name} 기준</span>}
    </dd>
  );
}
