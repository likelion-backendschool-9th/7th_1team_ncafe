import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 브라우저의 /api/... 요청을 백엔드로 넘긴다(같은 출처라 CORS 설정 없이 로그인 세션 쿠키가 그대로 간다). lib/api.ts 참고.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_BASE_URL ?? "http://localhost:8080"}/api/:path*` }];
  },
};

export default nextConfig;
