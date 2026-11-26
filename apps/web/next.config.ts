import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/screenpulse-image-sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
      ],
    }];
  },
  experimental: {
    // Screenshot files are capped at 5 MB in application validation. Leave room
    // for multipart form-data boundaries and metadata sent to the Server Action.
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
