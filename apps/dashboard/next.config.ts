import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Monorepo root: makes `next build` trace the whole workspace and emit a
  // portable standalone output (used by apps/dashboard/Dockerfile).
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  experimental: {
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
  },
};

export default nextConfig;
