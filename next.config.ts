import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  webpack(config, { dev }) {
    if (dev) {
      // Avoid intermittent Windows ENOENT errors from webpack filesystem pack cache.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
