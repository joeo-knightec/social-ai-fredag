import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: isProd ? '/social-ai-fredag/' : '',
  basePath: isProd ? '/social-ai-fredag' : '',
  output: 'export',
};

export default nextConfig;
