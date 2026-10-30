/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8080/api/:path*',
      },
      {
        source: '/v1/:path*',
        destination: 'http://127.0.0.1:8080/v1/:path*',
      },
      {
        source: '/ready',
        destination: 'http://127.0.0.1:8080/ready',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8080/health',
      },
    ]
  },
}

module.exports = nextConfig
