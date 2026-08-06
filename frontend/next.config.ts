import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/ai/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/ai/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/admin/:path*`,
      },
      {
        source: '/api/tickets',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/tickets`,
      },
      {
        source: '/api/tickets/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/tickets/:path*`,
      },
    ];
  },
};

export default nextConfig;
