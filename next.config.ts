import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-807a8f1d-e561-4ed9-9e1f-9666c43df414.space-z.ai',
    '.space-z.ai',
  ],
};

export default nextConfig;
