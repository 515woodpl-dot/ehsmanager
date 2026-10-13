/**
 * GET /api/heartbeat
 *
 * Checks the configured PIBASE project with a lightweight query.
 * Returns a failed status when the project cannot be reached.
 *
 * Requires env vars:
 *   NEXT_PUBLIC_PIBASE_URL
 *   PIBASE_SERVICE_KEY
 *
 * Optional secret to prevent abuse:
 *   HEARTBEAT_SECRET — if set, caller must pass ?secret=<value>
 */
import crypto from 'crypto'

const sameSecret = (given, expected) => {
  const a = Buffer.from(String(given || '')), b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Optional secret check
  const secret = process.env.HEARTBEAT_SECRET
  if (secret && !sameSecret(req.headers['x-heartbeat-secret'] || req.query.secret, secret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const pibaseUrl = process.env.NEXT_PUBLIC_PIBASE_URL
  const serviceKey  = process.env.PIBASE_SERVICE_KEY

  // Missing PIBASE configuration is a failed health check
  if (!pibaseUrl || !serviceKey) {
    return res.status(503).json({
      ok: false,
      message: 'PIBASE is not configured',
      ts: new Date().toISOString(),
    })
  }

  try {
    // Read a public table. The service key
    // keeps this probe independent of the tenant's RLS policies.
    const response = await fetch(`${pibaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    })

    const alive = response.ok

    return res.status(alive ? 200 : 503).json({
      ok: alive,
      pibase_status: response.status,
      message: alive ? 'Database is reachable' : 'Database returned an error',
      ts: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[heartbeat]', err)
    return res.status(500).json({
      ok: false,
      error: 'Database is unreachable',
      ts: new Date().toISOString(),
    })
  }
}
