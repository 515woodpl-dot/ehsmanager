/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      // The service worker must always be re-checked so updates reach users.
      { source: '/sw.js', headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ] },
    ]
  },
  async rewrites() {
    const host = process.env.BOOKING_HOST || 'booking.elliesheartstrings.com'
    return host ? { beforeFiles: [{ source: '/', has: [{ type: 'host', value: host }], destination: '/booking' }] } : []
  },
}
module.exports = nextConfig
