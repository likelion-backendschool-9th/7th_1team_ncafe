// 고객이 고른 지점 — 메뉴판 · 메뉴 상세 · 메인 라인업 · 마이페이지 찜이 같은 지점의 품절 · 숨김을 보여 주도록 함께 쓴다.
// 브라우저(localStorage)에 남겨 새로고침 · 다음 방문에도 유지되고, 다른 탭에서 바꾸면 이 탭도 따라온다(lib/localStore).
// 서버 렌더 · 캐시 페이지는 이 값을 모른다(기본값 null) — 품절 · 숨김은 화면이 뜬 뒤 브라우저에서 받아 덮어쓴다.
import { createLocalStore } from "@/lib/localStore";

export interface SelectedBranch {
  id: string;
  name: string;
}

function parse(raw: unknown): SelectedBranch | null {
  if (!raw || typeof raw !== "object") return null;
  const { id, name } = raw as Record<string, unknown>;
  return typeof id === "string" && typeof name === "string" ? { id, name } : null;
}

export const selectedBranchStore = createLocalStore<SelectedBranch | null>("ncafe.menu.branch", null, parse);
