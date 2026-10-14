import { createServiceClient } from '../../../lib/pibase'
import { defaultStudioId } from '../../../lib/studioConfig'
import { ICONS, renderIcon } from '../../../lib/appIcon'

// Public: the installable app's icons, made from the studio's logo.
export default async function handler(req, res) {
  const name = String(req.query.name || '')
  if (!ICONS[name]) return res.status(404).end()
  let branding = {}
  const db = createServiceClient()
  const studioId = defaultStudioId(req)
  if (db && /^[0-9a-f-]{36}$/i.test(studioId)) {
    const { data } = await db.from('studio_settings').select('branding').eq('user_id', studioId).maybeSingle()
    branding = data?.branding || {}
  }
  try {
    const png = await renderIcon(name, branding)
    res.setHeader('Content-Type', 'image/png')
    // Short cache: the manifest links include a version that changes with the logo.
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).send(png)
  } catch (error) {
    console.error('[app-icon]', error)
    return res.status(500).end()
  }
}
