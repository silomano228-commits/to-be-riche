import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
  ],
};

export default nextConfig;
