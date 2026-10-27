// 찜한 메뉴 — 백엔드 /api/v1/me/favorites (로그인 필요). 메뉴 단위로 찜한다.
// 로그인 세션 · CSRF 가 필요해 브라우저에서만 부른다(lib/api.ts 의 api()가 둘 다 처리한다).
import { api } from "@/lib/api";

/** 찜한 메뉴 id 목록 — 최근 찜한 순 */
export function getFavorites(): Promise<number[]> {
  return api<number[]>("/me/favorites");
}

export async function addFavorite(menuId: number): Promise<void> {
  await api<void>(`/me/favorites/${menuId}`, { method: "PUT" });
}

export async function removeFavorite(menuId: number): Promise<void> {
  await api<void>(`/me/favorites/${menuId}`, { method: "DELETE" });
}
