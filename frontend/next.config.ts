import type { NextConfig } from "next";

const getNormalizedBackendUrl = () => {
  const raw = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  return `https://${raw}`;
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = getNormalizedBackendUrl();
    return [
      {
        source: '/api/ai/:path*',
        destination: `${backendUrl}/api/ai/:path*`,
      },
      {
        source: '/api/tickets',
        destination: `${backendUrl}/api/tickets`,
      },
      {
        source: '/api/tickets/:path*',
        destination: `${backendUrl}/api/tickets/:path*`,
      },
    ];
  },
};

export default nextConfig;
