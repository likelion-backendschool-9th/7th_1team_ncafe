import type { NextConfig } from "next";

// 백엔드(Spring) 주소 — 브라우저는 /api/v1/* 로 부르고 Next 가 이 주소로 넘긴다(같은 출처라 세션 쿠키가 오가고 CORS 가 필요 없다).
// 빌드할 때 정해지므로 주소를 바꾸면 다시 빌드한다. 순위 계산 Route Handler(/api/race-ranking)는 /api/v1 밖이라 Next 가 직접 받는다.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  distDir: process.env.FRONTEND_DIST_DIR ?? ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 브라우저의 /api/... 요청을 백엔드로 넘긴다(같은 출처라 CORS 설정 없이 로그인 세션 쿠키가 그대로 간다). lib/api.ts 참고.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.API_BASE_URL ?? "http://localhost:8080"}/api/:path*` }];
  },
};

export default nextConfig;
