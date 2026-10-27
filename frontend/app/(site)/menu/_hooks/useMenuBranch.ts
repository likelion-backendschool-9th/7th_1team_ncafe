"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { selectedBranchStore, type SelectedBranch } from "../_lib/branchStore";
import { getMenuStatuses } from "../_lib/menuService";
import type { Menu, MenuStatus } from "../_types";

/** 고른 지점(없으면 null) — 메뉴판에서 고르고, 다른 화면은 읽기만 한다 */
export function useSelectedBranch(): SelectedBranch | null {
  return useSyncExternalStore(selectedBranchStore.subscribe, selectedBranchStore.get, selectedBranchStore.getServer);
}

// 같은 화면의 여러 곳(상세의 판매 상태 줄 · 담기 영역 등)이 동시에 부르면 요청 하나를 같이 쓴다
const inflight = new Map<string, Promise<Map<number, MenuStatus>>>();
function loadStatuses(branchId: string) {
  let request = inflight.get(branchId);
  if (!request) {
    request = getMenuStatuses(branchId).finally(() => inflight.delete(branchId));
    inflight.set(branchId, request);
  }
  return request;
}

/**
 * 고른 지점의 메뉴별 판매 상태. 그 지점에서 숨긴 메뉴는 결과에 없다.
 * statuses 가 null 이면 아직 받는 중이거나(failed=false) 받지 못했다(failed=true) — 그때는 판매 중으로 본다.
 */
export function useBranchStatuses(branchId: string | null) {
  const [loaded, setLoaded] = useState<{ branchId: string; statuses: Map<number, MenuStatus> | null } | null>(null);

  useEffect(() => {
    if (!branchId) return;
    let ignore = false; // 지점을 빠르게 바꾸면 늦게 온 이전 응답은 버린다
    loadStatuses(branchId)
      .then((statuses) => !ignore && setLoaded({ branchId, statuses }))
      .catch(() => !ignore && setLoaded({ branchId, statuses: null }));
    return () => {
      ignore = true;
    };
  }, [branchId]);

  const current = branchId && loaded?.branchId === branchId ? loaded : null;
  return { statuses: current?.statuses ?? null, failed: current !== null && current.statuses === null };
}

/**
 * 고른 지점에서 이 메뉴의 판매 상태 — 메뉴 상세의 판매 상태 줄 · 품절 도장이 같이 쓴다.
 * 그 지점에서 숨긴 메뉴는 상태 목록에 없어 HIDDEN, 상태를 받기 전 · 못 받았으면 메뉴의 기본 상태.
 */
export function useBranchMenuStatus(menu: Menu): { branch: SelectedBranch | null; status: MenuStatus } {
  const branch = useSelectedBranch();
  const { statuses } = useBranchStatuses(branch?.id ?? null);
  return { branch, status: statuses ? (statuses.get(menu.id) ?? "HIDDEN") : menu.status };
}

/** 지점 상태를 입힌 메뉴 — 그 지점에서 숨긴 메뉴는 빼고, 품절은 status 로 표시한다. 상태를 못 받았으면 그대로 */
export function withBranchStatuses(menus: Menu[], statuses: Map<number, MenuStatus> | null): Menu[] {
  return statuses ? menus.filter((m) => statuses.has(m.id)).map((m) => ({ ...m, status: statuses.get(m.id)! })) : menus;
}
