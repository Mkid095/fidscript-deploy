import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The app is small and single-container; a plain build is the simplest
  // reliable image shape. The standalone output is left out so the Prisma
  // client and its engine stay in node_modules where they belong.
  reactStrictMode: true,
};

export default nextConfig;
