export interface Branch {
  id: string;
  name: string;
  address: string;
  sections: string | null;
  fixtures: string | null;
  open: boolean;
  createdDate: string;
}

export interface BranchInput {
  id: string;
  name: string;
  address: string;
  sections: string;
  fixtures: string;
  open: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = response.status === 401 ? "로그인이 만료되었거나 필요합니다."
      : response.status === 403 ? "관리자 권한이 필요합니다."
      : response.status >= 500 ? "서버 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : body?.message ?? "요청을 처리하지 못했습니다.";
    throw new ApiError(response.status, message);
  }
  return response.json();
}

export const getBranches = () => request<Branch[]>("/api/v1/branches");

export async function getAdminSession(): Promise<boolean> {
  try {
    const member = await request<{ role: string }>("/api/v1/auth/me");
    return member.role === "ADMIN";
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false;
    throw error;
  }
}

export function saveBranch(input: BranchInput, editingId: string | null) {
  const { id, ...fields } = input;
  return request<Branch>(`/api/v1/admin/branches${editingId === null ? "" : `/${encodeURIComponent(editingId)}`}`, {
    method: editingId === null ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(editingId === null ? { id, ...fields } : fields),
  });
}

export function validateBranch(input: BranchInput): Partial<Record<keyof BranchInput, string>> {
  const errors: Partial<Record<keyof BranchInput, string>> = {};
  if (!/^[a-zA-Z0-9가-힣_-]{1,255}$/.test(input.id.trim())) {
    errors.id = "지점 ID는 영문, 숫자, 한글, 밑줄, 하이픈으로 1~255자 입력해 주세요.";
  }
  if (!input.name.trim() || input.name.trim().length > 100) errors.name = "지점명은 1~100자로 입력해 주세요.";
  if (!input.address.trim() || input.address.trim().length > 255) errors.address = "주소는 1~255자로 입력해 주세요.";
  for (const key of ["sections", "fixtures"] as const) {
    try {
      if (!Array.isArray(JSON.parse(input[key].trim() || "[]"))) throw new Error();
    } catch {
      errors[key] = "올바른 JSON 배열을 입력해 주세요. 비워 두면 빈 배열로 저장합니다.";
    }
  }
  return errors;
}
