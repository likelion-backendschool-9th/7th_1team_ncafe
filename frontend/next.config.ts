import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.FRONTEND_DIST_DIR ?? ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const backend = (process.env.BACKEND_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
    return [
      { source: "/api/v1/branches/:path*", destination: `${backend}/api/v1/branches/:path*` },
      { source: "/api/v1/admin/branches/:path*", destination: `${backend}/api/v1/admin/branches/:path*` },
      { source: "/api/v1/auth/:path*", destination: `${backend}/api/v1/auth/:path*` },
    ];
  },
};

export default nextConfig;
