/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['leve-assets.s3.amazonaws.com', 'cdn.leve.am'],
  },
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
