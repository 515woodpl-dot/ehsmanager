/**
 * GET /api/heartbeat
 *
 * Keeps the Supabase project alive by running a lightweight query.
 * Call this every 3–4 days from a cron job or external service
 * (e.g. cron-job.org) to prevent Supabase pausing a free-tier project.
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL   — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (server-side only)
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  // If Supabase isn't configured yet, return a healthy no-op
  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json({
      ok: true,
      message: 'Supabase not configured yet — heartbeat is a no-op',
      ts: new Date().toISOString(),
    })
  }

  try {
    // Lightweight query: fetch Postgres current timestamp — touches DB, wakes project
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({}),
    })

    // Supabase returns 404 if the `now` RPC doesn't exist — that's fine,
    // the HTTP round-trip alone is enough to keep the project active.
    const alive = response.status < 500

    return res.status(200).json({
      ok: alive,
      supabase_status: response.status,
      message: alive ? 'Supabase is alive' : 'Supabase returned an error',
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
