import type { NextConfig } from "next";

// When building for GitHub Pages, the site is served under
// https://<user>.github.io/<repo>/, so we need a basePath. The workflow sets
// NEXT_PUBLIC_BASE_PATH="/drivers-guide" before running `next build`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
