// 백엔드(Spring) API 호출 헬퍼 — 각 라우트의 _lib/*Service.ts 가 쓴다.
// 서버(서버 컴포넌트 · "use cache")에서는 API_BASE_URL 로 백엔드를 바로 부르고,
// 브라우저에서는 같은 출처의 /api/... 로 부른다(next.config.ts 의 rewrites 가 백엔드로 넘긴다 — 로그인 세션 쿠키가 그대로 간다).

const SERVER_API_BASE = process.env.API_BASE_URL ?? "http://localhost:8080";

/** 백엔드 오류 응답(common/dto/ErrorResponse) */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = typeof window === "undefined" ? SERVER_API_BASE : "";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? `요청에 실패했습니다 (${res.status})`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
