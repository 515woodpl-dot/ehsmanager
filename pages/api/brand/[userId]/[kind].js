import { createServiceClient } from '../../../../lib/pibase'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public: serves a studio's logo or contract cover photo. The signature is
// deliberately not served here; it is only embedded in the contracts it signs.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end()
  const { userId, kind } = req.query
  if (!UUID.test(String(userId)) || !['logo', 'cover'].includes(kind)) return res.status(404).end()
  const db = createServiceClient()
  if (!db) return res.status(503).end()

  const { data } = await db.from('studio_assets').select('content_type, data')
    .eq('user_id', userId).eq('kind', kind).single()
  if (!data) return res.status(404).end()

  const body = Buffer.from(data.data, 'base64')
  res.setHeader('Content-Type', data.content_type)
  res.setHeader('Content-Length', body.length)
  // URLs carry ?v=<updated time>, so a new upload gets a new URL.
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Content-Security-Policy', "default-src 'none'")
  return res.status(200).end(req.method === 'HEAD' ? undefined : body)
}
