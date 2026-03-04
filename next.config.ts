import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  async redirects() {
    return [
      {
        source: '/graph',
        destination: '/?view=graph',
        permanent: false,
      },
      {
        source: '/sessions',
        destination: '/?view=social',
        permanent: false,
      },
      {
        source: '/timeline',
        destination: '/?view=activity',
        permanent: false,
      },
      {
        source: '/mockup',
        destination: '/',
        permanent: false,
      },
    ];
  },
  webpack(config, { dev }) {
    if (dev) {
      // Avoid intermittent Windows ENOENT errors from webpack filesystem pack cache.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
