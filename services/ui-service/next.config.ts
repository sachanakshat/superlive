import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // This makes Next.js skip static optimization for all pages
  experimental: {
    // Disabling server side rendering for the build
    appDocumentPreloading: false,
  },
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ignore ESLint errors during builds to allow development
    ignoreDuringBuilds: true,
  }
};

// https://nextjs.org/docs/app/api-reference/next-config-js
export default nextConfig;
