/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/con-defaulter',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
