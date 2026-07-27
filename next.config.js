/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/blog/2026-03-:slug*', destination: '/', permanent: true },
      { source: '/blog/2026-04-:slug*', destination: '/', permanent: true },
      { source: '/blog/2026-05-:slug*', destination: '/', permanent: true },
      { source: '/blog/2026-06-:slug*', destination: '/', permanent: true },
    ]
  },
}

module.exports = nextConfig
