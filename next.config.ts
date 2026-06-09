import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      // SPA fallback for /timelock/* routes - serve index.html for all sub-routes
      {
        source: '/timelock/:path((?!assets|logo|favicon).*)*',
        destination: '/timelock/index.html',
      },
    ];
  },
};

export default nextConfig;
