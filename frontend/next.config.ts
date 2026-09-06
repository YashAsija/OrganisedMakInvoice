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
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'country-state-city',
      '@supabase/supabase-js',
      'xlsx'
    ],
  },
  async headers() {
    return [
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ] : []),
      {
        source: '/logo.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
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
