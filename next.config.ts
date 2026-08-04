import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["phongpc.local"],
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "phongpc.local",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "**.example.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
  },
};

export default nextConfig;
