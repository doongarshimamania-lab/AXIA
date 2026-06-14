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
      // Proxy /timelock/ requests to the Vite app server on port 3001
      {
        source: '/timelock/:path*',
        destination: 'http://localhost:3001/:path*',
      },
      // Also proxy the root to the Vite app (for direct access)
      {
        source: '/assets/:path*',
        destination: 'http://localhost:3001/assets/:path*',
      },
    ];
  },
};

export default nextConfig;
