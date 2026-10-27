import type { NextConfig } from "next";

// 백엔드(Spring) 주소 — 브라우저는 /api/v1/* 로 부르고 Next 가 이 주소로 넘긴다(같은 출처라 세션 쿠키가 오가고 CORS 가 필요 없다).
// 빌드할 때 정해지므로 주소를 바꾸면 다시 빌드한다. 순위 계산 Route Handler(/api/race-ranking)는 /api/v1 밖이라 Next 가 직접 받는다.
// lib/api.ts 의 apiFetch(서버에서 백엔드를 바로 부름)도 같은 BACKEND_URL 을 쓴다.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  distDir: process.env.FRONTEND_DIST_DIR ?? ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
