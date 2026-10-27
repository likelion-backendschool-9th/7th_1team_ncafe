"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getGrades } from "../_lib/gradeService";
import type { GradeInfo } from "../_types";

/**
 * 내 등급 — 메뉴 해금 판단용. 로그인 회원의 gradeId(/auth/me)를 등급 목록에서 찾는다.
 * 등급은 쿠폰을 받을 때 서버가 누적 쿠폰으로 매긴다(CouponService.earn).
 * 로그아웃 · 등급 미지정(등급 데이터가 없을 때)이면 grade 는 null, minTotal 은 0(가장 낮은 등급과 같다).
 */
export function useMyGrade(): { loggedIn: boolean; grade: GradeInfo | null; minTotal: number; totalEarned: number } {
  const { member } = useAuth();
  const memberNo = member?.no ?? null;
  const gradeId = member?.gradeId ?? null;
  // 등급 목록은 불러온 회원과 함께 들고 있는다 — 로그아웃하면 바로 비운 것처럼 본다
  const [loaded, setLoaded] = useState<{ memberNo: number; grades: GradeInfo[] } | null>(null);

  useEffect(() => {
    if (memberNo === null || gradeId === null) return;
    let ignore = false;
    getGrades()
      .then((grades) => !ignore && setLoaded({ memberNo, grades }))
      .catch(() => !ignore && setLoaded({ memberNo, grades: [] }));
    return () => {
      ignore = true;
    };
  }, [memberNo, gradeId]);

  const grades = loaded?.memberNo === memberNo ? loaded.grades : [];
  const grade = grades.find((g) => g.id === gradeId) ?? null;
  return {
    loggedIn: memberNo !== null,
    grade,
    minTotal: grade?.minTotalCoupons ?? 0,
    totalEarned: member?.totalEarnedCoupons ?? 0,
  };
}
