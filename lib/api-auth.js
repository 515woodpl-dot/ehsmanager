import { createServiceClient } from './pibase'
import { APP_URL, loadStudioConfig } from './studioConfig'

/**
 * Validates the PIBASE access token from the Authorization header
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

  // Per-studio business details and integration keys (see Settings).
  const config = await loadStudioConfig(db, user.id, req)
  // Without NEXT_PUBLIC_APP_URL, remember the address the owner uses so links
  // created later by clients' actions (signing, chat, contact form) use it.
  if (!APP_URL && config.origin && config.origin !== config.integrations.appOrigin && !config.migrationNeeded) {
    const integrations = { ...config.integrations, appOrigin: config.origin }
    const { error } = await db.from('studio_settings').update({ integrations }).eq('user_id', user.id)
    if (!error) config.integrations = integrations
  }
  return { user, profile: profile || {}, db, config }
}
