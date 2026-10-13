/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const host = process.env.BOOKING_HOST || 'booking.elliesheartstrings.com'
    return host ? { beforeFiles: [{ source: '/', has: [{ type: 'host', value: host }], destination: '/booking' }] } : []
  },
}
module.exports = nextConfig
