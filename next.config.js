/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PDF import runs pdf.js on the server; keep it out of the bundler.
  serverExternalPackages: ['pdfjs-dist'],
  // deploy.sh builds into .next-build (NEXT_DIST_DIR) and swaps it in, so the live site never goes down.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Builds must be plain and repeatable: no AI-agent upgrade nudges (which stop the build).
  experimental: { agentUpgrade: false, agentFeedback: false },
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
