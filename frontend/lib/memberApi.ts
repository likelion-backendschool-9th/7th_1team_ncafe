export interface Member {
  no: number; loginId: string; gradeId: number | null; role: string;
  totalEarnedCoupons: number; // 지금까지 받은 쿠폰 수 — 등급 기준(쿠폰을 써도 줄지 않는다)
  nickname: string; birth: string | null; gender: string | null;
  phoneNumber: string | null; email: string | null; postcode: string | null;
  address1: string | null; address2: string | null;
  couponCount: number; loseStreak: number; joinDate: string;
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function memberApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  try {
    if (method !== "GET") {
      const response = await fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new ApiError(response.status, "요청을 준비하지 못했습니다. 서버 연결을 확인해주세요.");
      const csrf = await response.json();
      headers[csrf.headerName] = csrf.token;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`/api/v1${path}`, { method, headers, credentials: "same-origin", cache: "no-store", body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new ApiError(response.status, error?.message ?? (response.status === 401 ? "다시 로그인해주세요." : "요청을 처리하지 못했습니다. 다시 시도해주세요."));
    }
    return response.status === 204 ? undefined as T : response.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new Error("서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}
