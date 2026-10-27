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
  }
}

const UNREACHABLE = "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function api<T>(path: string, init: { method?: Method; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
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
