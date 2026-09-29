import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Screenshot files are capped at 5 MB in application validation. Leave room
    // for multipart form-data boundaries and metadata sent to the Server Action.
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
