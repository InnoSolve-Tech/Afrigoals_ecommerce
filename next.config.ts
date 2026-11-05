import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Self-contained server bundle used by the Docker image (see Dockerfile).
  output: "standalone",
  reactCompiler: true,
  turbopack: {
    root: rootDir,
  },
  images: {
    qualities: [75, 100],
    remotePatterns: [
      // Local dev (if your upload URLs come from your API server)
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
