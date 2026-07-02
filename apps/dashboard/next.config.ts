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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dfp7uhzy3/image/upload/**',
      },
      // Allow storage signed URLs from any configured storage endpoint
      { protocol: 'https', hostname: '*.fidscript.dev' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
    ],
  },
  experimental: {
    turbopack: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
  },
};

export default nextConfig;
