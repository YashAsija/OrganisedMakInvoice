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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.razorpay.com https://checkout.razorpay.com; frame-src https://checkout.razorpay.com https://api.razorpay.com; frame-ancestors 'none'",
          },
        ],
      },
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
        source: '/api/ai/generate-description',
        destination: `${backendUrl}/api/ai/generate-description`,
      },
    ];
  },
};

export default nextConfig;
