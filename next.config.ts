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
  env: {
    // Fallback: ensure DATABASE_URL is always set for Prisma internal validation
    // Even when using the Turso adapter, Prisma validates this URL format
    DATABASE_URL: process.env.DATABASE_URL || 'file:./db/local.db',
  },
};

export default nextConfig;
