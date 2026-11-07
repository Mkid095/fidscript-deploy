import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The standalone output.
   *
   * The image carries only what the server needs to run — the server
   * bundle, the static files and the public folder — and not the whole
   * node_modules of the build machine.
   */
  output: "standalone",
};

export default nextConfig;
