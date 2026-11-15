import crypto from 'crypto'
import { createServiceClient } from '../../lib/pibase'
import { defaultStudioId } from '../../lib/studioConfig'

// The business name and logo for the manager's own screens (login, sidebar,
// tab title, install banner). Public: it's the same name and logo clients
// already see on the booking and contact pages. Empty until the owner saves
// them in Settings, and the app then shows "Local Manager".
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const studioId = defaultStudioId(req)
  const db = createServiceClient()
  let branding = {}
  if (db && /^[0-9a-f-]{36}$/i.test(studioId)) {
    const { data } = await db.from('studio_settings').select('branding').eq('user_id', studioId).maybeSingle()
    branding = data?.branding || {}
  }
  const logo = /^data:image\/(png|jpeg|webp);base64,/.test(branding.logo || '')
    ? `/api/logo/${studioId}?v=${crypto.createHash('sha1').update(branding.logo).digest('hex').slice(0, 8)}`
    : ''
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ name: String(branding.businessName || '').trim(), logo })
}
