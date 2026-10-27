// 회원 등급 — 백엔드 GET /api/v1/grades (로그인 필요). 지금까지 받은 쿠폰 수(누적) 기준, 낮은 등급부터.
// 로그인 세션이 필요해 브라우저에서만 부른다(lib/api.ts 의 api()).
import { api } from "@/lib/api";
import type { GradeInfo, Menu } from "../_types";

export function getGrades(): Promise<GradeInfo[]> {
  return api<GradeInfo[]>("/grades");
}

/**
 * 이 메뉴가 잠겼으면 필요한 등급, 아니면 null.
 * myMinTotal: 내 등급의 필요 누적 쿠폰(로그아웃 · 등급 미지정이면 0 = 가장 낮은 등급).
 */
export function lockOf(menu: Pick<Menu, "requiredGrade">, myMinTotal: number) {
  const grade = menu.requiredGrade;
  return grade && grade.minTotalCoupons > myMinTotal ? grade : null;
}
