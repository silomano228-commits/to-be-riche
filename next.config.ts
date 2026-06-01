import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: 'standalone',
  serverExternalPackages: [
    '@prisma/client',
  ],
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'file:./db/local.db',
  },
};

export default nextConfig;
