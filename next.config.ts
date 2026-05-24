import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core"],
  outputFileTracingIncludes: {
    "/api/pricing": ["./node_modules/playwright-core/**/*"],
    "/api/warm-cache": ["./node_modules/playwright-core/**/*"],
  },
};

export default nextConfig;
