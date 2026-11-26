// Build info shown in the app (sidebar + /api/version) so it's easy to tell which version is live.
const { execSync } = require('child_process')
const gitCommit = (() => { try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return 'dev' } })()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
    NEXT_PUBLIC_APP_COMMIT: gitCommit,
    NEXT_PUBLIC_APP_BUILT: new Date().toISOString(),
  },
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
