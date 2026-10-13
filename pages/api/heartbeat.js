/**
 * GET /api/heartbeat
 *
 * Checks the configured Supabase-compatible database with a lightweight query.
 * This remains useful for Supabase, while PIBASE deployments can use it as a
 * simple monitoring endpoint without the old free-tier wake-up requirement.
 *
 * Requires env vars:
 *   NEXT_PUBLIC_PIBASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   PIBASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional secret to prevent abuse:
 *   HEARTBEAT_SECRET — if set, caller must pass ?secret=<value>
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Optional secret check
  const secret = process.env.HEARTBEAT_SECRET
  if (secret && req.query.secret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_PIBASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.PIBASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  // If Supabase isn't configured yet, return a healthy no-op
  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json({
      ok: true,
      message: 'Database not configured yet — heartbeat is a no-op',
      ts: new Date().toISOString(),
    })
  }

  try {
    // A public-table read works on both Supabase and PIBASE. The service key
    // keeps this probe independent of the tenant's RLS policies.
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    })

    const alive = response.status < 500

    return res.status(200).json({
      ok: alive,
      supabase_status: response.status,
      message: alive ? 'Database is reachable' : 'Database returned an error',
      ts: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
      ts: new Date().toISOString(),
    })
  }
}
