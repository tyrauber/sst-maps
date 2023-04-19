/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    DEFAULT_TILES: process.env.DEFAULT_TILES || 'hawaii'
  },
}

module.exports = nextConfig
