import { createServiceClient } from './supabase'

/**
 * Validates the Supabase access token from the Authorization header
 * and returns { user, profile, db } — or sends a 401 and returns null.
 *
 * Usage in an API route:
 *   const auth = await requireUser(req, res)
 *   if (!auth) return
 */
export async function requireUser(req, res) {
  const db = createServiceClient()
  if (!db) {
    res.status(500).json({ error: 'Database not configured' })
    return null
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return null
  }

  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Invalid session' })
    return null
  }

  const { data: profile } = await db
    .from('profiles')
    .select('email, full_name, business_name, plan')
    .eq('id', user.id)
    .single()

  return { user, profile: profile || {}, db }
}
