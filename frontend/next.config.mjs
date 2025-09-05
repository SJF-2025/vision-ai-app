/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/vision-ai-app' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/vision-ai-app' : '',
};

export default nextConfig;
