import { createServiceClient } from '../../../lib/pibase'

// Serves a studio's uploaded logo (stored as a data URL in branding) as an
// image, so emails and client pages can link to it.
export default async function handler(req, res) {
  const userId = String(req.query.userId || '')
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return res.status(404).end()
  const db = createServiceClient()
  if (!db) return res.status(404).end()
  const { data } = await db.from('studio_settings').select('branding').eq('user_id', userId).maybeSingle()
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data?.branding?.logo || '')
  if (!match) return res.status(404).end()
  res.setHeader('Content-Type', match[1])
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.status(200).send(Buffer.from(match[2], 'base64'))
}
