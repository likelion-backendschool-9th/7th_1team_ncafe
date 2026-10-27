// 백엔드(Spring) API 호출 헬퍼 — 실패하면 ApiError(서버 ErrorResponse 의 code · message).
// - api: 브라우저에서 /api/v1/* 로 부르면 Next 가 Spring 으로 넘긴다(next.config.ts rewrites). 같은 출처라 로그인 세션 쿠키(JSESSIONID)가
//   그대로 오간다. 상대 경로라 브라우저에서만 부른다 — 서버 렌더 · 빌드 때는 부르지 않는다. 변경 요청은 CSRF 토큰을 함께 보낸다(SecurityConfig).
// - apiFetch: 각 라우트의 _lib/*Service.ts 가 쓴다. 서버(서버 컴포넌트 · "use cache")에서는 BACKEND_URL 로 백엔드를 바로 부르고,
//   브라우저에서는 같은 출처의 /api/... 로 부른다.

const SERVER_API_BASE = process.env.BACKEND_URL ?? process.env.API_BASE_URL ?? process.env.API_ORIGIN ?? "http://127.0.0.1:8080";

/** 백엔드 오류 응답(common/dto/ErrorResponse) */
export class ApiError extends Error {
  constructor(
    readonly status: number, // 0 = 서버에 닿지 못함
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const UNREACHABLE = "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** 변경 요청에 붙일 CSRF 헤더 — 로그인하면 토큰이 바뀌므로 요청할 때마다 받는다 */
async function csrfHeader(): Promise<Record<string, string>> {
  const res = await fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, "CSRF_UNAVAILABLE", "요청을 준비하지 못했습니다.");
  const csrf = (await res.json()) as { headerName: string; token: string };
  return { [csrf.headerName]: csrf.token };
}

export async function api<T>(path: string, init: { method?: Method; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? "GET";
  let res: Response;
  try {
    const headers: Record<string, string> = method === "GET" ? {} : await csrfHeader();
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "NETWORK", UNREACHABLE);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null; // 프록시가 돌려준 HTML 오류 등
  }
  if (!res.ok) {
    const err = (body ?? {}) as { code?: string; message?: string };
    if (!err.code && res.status >= 500) throw new ApiError(0, "NETWORK", UNREACHABLE); // 백엔드가 꺼져 프록시가 실패
    if (res.status === 401 && !err.code) throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요해요.");
    if (res.status === 403 && !err.code) throw new ApiError(403, "FORBIDDEN", "권한이 없어요.");
    throw new ApiError(res.status, err.code ?? `HTTP_${res.status}`, err.message ?? "요청을 처리하지 못했어요.");
  }
  return body as T;
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
