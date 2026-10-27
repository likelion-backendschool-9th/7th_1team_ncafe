// 메뉴판 캐시 무효화 — 관리자가 메뉴 · 카테고리를 저장한 뒤 브라우저가 부른다(app/admin/menus/_lib/menuAdminService.ts).
// 메뉴판 · 메뉴 상세 · 메인 라인업은 "use cache"(1시간)라, 이걸 부르지 않으면 관리자 변경이 늦게 보인다.
// /api/v1 밖이라 Next 가 직접 받는다(next.config.ts rewrites 는 /api/v1/* 만 백엔드로 넘긴다).
// 아무나 캐시를 비우지 못하게, 요청의 로그인 세션으로 백엔드 /auth/me 를 불러 메뉴를 고칠 수 있는 관리자인지 확인한다.
import { revalidateTag } from "next/cache";
import { MENU_CACHE_TAG } from "@/app/(site)/menu/_lib/menuCache";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
// SecurityConfig 에서 /api/v1/admin/** (메뉴 · 카테고리 변경)을 쓸 수 있는 역할
const MENU_EDITOR_ROLES = ["ADMIN", "HQ_ADMIN"];

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return Response.json({ revalidated: false, message: "로그인이 필요해요." }, { status: 401 });

  let role: string | undefined;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, { headers: { cookie }, cache: "no-store" });
    if (!res.ok) return Response.json({ revalidated: false, message: "로그인이 필요해요." }, { status: 401 });
    role = ((await res.json()) as { role?: string }).role;
  } catch {
    return Response.json({ revalidated: false, message: "서버에 연결할 수 없어요." }, { status: 502 });
  }
  if (!role || !MENU_EDITOR_ROLES.includes(role)) {
    return Response.json({ revalidated: false, message: "권한이 없어요." }, { status: 403 });
  }

  // expire: 0 — 다음 요청이 옛 메뉴를 받지 않고 바로 새로 만든다(저장한 관리자가 메뉴판을 열면 곧바로 보인다)
  revalidateTag(MENU_CACHE_TAG, { expire: 0 });
  // 참고: 빌드 때 미리 만든 메뉴 상세(/menu/1 …)는 무효화 직후 첫 요청에 한 번 옛 화면이 나가고 그다음부터 새 화면이다.
  // revalidatePath("/(site)/menu/[id]", "page")를 더하면 상세 페이지를 다시 만들 때 500(NEXT_STATIC_GEN_BAILOUT)이 나서 쓰지 않는다.
  return Response.json({ revalidated: true });
}
