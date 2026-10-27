// 메뉴 도메인의 백엔드 호출 — menuService.ts 만 쓴다.
// 메뉴판 · 상세 · 메인 라인업은 서버 컴포넌트("use cache")에서 데이터를 받으므로, 브라우저 전용인 lib/api.ts 의 api() 대신
// 서버에서도 부를 수 있는 이 함수를 쓴다.
//   서버: API_BASE_URL(next.config.ts 의 rewrites 와 같은 값)로 백엔드를 바로 부른다.
//   브라우저: 같은 출처의 /api/v1/... 로 부르고 next.config.ts 의 rewrites 가 백엔드로 넘긴다.
// 오류는 다른 파트와 같은 ApiError 로 던진다.
import { ApiError } from "@/lib/api";

const SERVER_API_BASE = process.env.API_BASE_URL ?? "http://localhost:8080";

/** path 는 /api/v1/... 전체 경로 */
export async function menuFetch<T>(path: string): Promise<T> {
  const base = typeof window === "undefined" ? SERVER_API_BASE : "";
  const res = await fetch(`${base}${path}`, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(res.status, body?.code ?? `HTTP_${res.status}`, body?.message ?? "메뉴 정보를 불러오지 못했어요.");
  }
  return (await res.json()) as T;
}
