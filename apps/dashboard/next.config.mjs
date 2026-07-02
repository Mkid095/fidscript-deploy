import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dfp7uhzy3/image/upload/**',
      },
      { protocol: 'https', hostname: '*.fidscript.dev' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
    ],
  },
};

export default nextConfig;
