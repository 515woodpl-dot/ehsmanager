import { requireUser } from '../../lib/api-auth'
import { ASSET_KINDS, assetUrl, parseImageDataUrl } from '../../lib/brandAssets'

// Uploads are resized in the browser first; this covers the 2 MB cover limit.
export const config = { api: { bodyParser: { sizeLimit: '3mb' } } }

// Admin → Branding: the owner's logo, contract cover photo and signature.
async function status(db, userId) {
  const { data, error } = await db.from('studio_assets').select('kind, updated_at').eq('user_id', userId)
  if (error) throw new Error(error.message)
  const result = { logo: null, cover: null, signature: null }
  for (const row of data || []) {
    if (row.kind === 'signature') {
      const { data: signature } = await db.from('studio_assets').select('content_type, data').eq('user_id', userId).eq('kind', 'signature').single()
      if (signature) result.signature = { url: `data:${signature.content_type};base64,${signature.data}`, updatedAt: row.updated_at }
    } else {
      result[row.kind] = { url: assetUrl(userId, row.kind, row.updated_at), updatedAt: row.updated_at }
    }
  }
  return result
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const auth = await requireUser(req, res)
  if (!auth) return
  const { db, user } = auth
  const kind = String(req.body?.kind || req.query.kind || '')

  try {
    if (req.method === 'GET') return res.status(200).json(await status(db, user.id))
    if (!ASSET_KINDS[kind]) return res.status(400).json({ error: 'Unknown asset' })
    if (req.method === 'PUT') {
      const parsed = parseImageDataUrl(kind, req.body?.dataUrl)
      if (typeof parsed === 'string') return res.status(400).json({ error: parsed })
      const { error } = await db.from('studio_assets').upsert({
        user_id: user.id, kind, content_type: parsed.contentType, data: parsed.data, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,kind' })
      if (error) throw new Error(error.message)
      return res.status(200).json(await status(db, user.id))
    }
    if (req.method === 'DELETE') {
      const { error } = await db.from('studio_assets').delete().eq('user_id', user.id).eq('kind', kind)
      if (error) throw new Error(error.message)
      return res.status(200).json(await status(db, user.id))
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[branding]', error.message)
    return res.status(500).json({ error: 'Unable to update branding. Has migration 004 been applied?' })
  }
}
