import { createServiceClient } from '../../lib/pibase'
import { defaultStudioId } from '../../lib/studioConfig'
import { cleanColor, iconVersion } from '../../lib/appIcon'

// Public: the web app manifest, named after the studio and using icons
// made from its logo (Settings → Business profile).
export default async function handler(req, res) {
  let branding = {}
  const db = createServiceClient()
  const studioId = defaultStudioId(req)
  if (db && /^[0-9a-f-]{36}$/i.test(studioId)) {
    const { data } = await db.from('studio_settings').select('branding').eq('user_id', studioId).maybeSingle()
    branding = data?.branding || {}
  }
  const name = (branding.businessName || 'EHS Studio Manager').trim()
  const shortName = name.length > 14 ? name.split(/\s+/).slice(0, 2).join(' ').slice(0, 14) : name
  const v = iconVersion(branding)
  const icon = (file, size, purpose) => ({ src: `/api/app-icon/${file}?v=${v}`, sizes: `${size}x${size}`, type: 'image/png', purpose })
  const shortcut = (label, view) => ({ name: label, short_name: label, url: `/?view=${view}&source=pwa`, icons: [{ src: `/api/app-icon/icon-192.png?v=${v}`, sizes: '192x192' }] })

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).send(JSON.stringify({
    id: '/',
    name,
    short_name: shortName,
    description: `Clients, sessions, invoices, contracts and messages for ${name}.`,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: cleanColor(branding.iconBackground),
    theme_color: '#ffffff',
    categories: ['business', 'productivity', 'photo'],
    icons: [icon('icon-192.png', 192, 'any'), icon('icon-512.png', 512, 'any'), icon('icon-maskable-512.png', 512, 'maskable')],
    shortcuts: [shortcut('Inbox', 'inbox'), shortcut('Clients', 'clients'), shortcut('Invoices', 'invoices'), shortcut('Calendar', 'calendar')],
  }))
}
