import fs from 'fs'
import path from 'path'
import { safeImageUrl } from './booking'

// Studio branding images (Admin → Branding), stored in `studio_assets`.
export const ASSET_KINDS = {
  logo: { maxBytes: 400 * 1024, label: 'Logo' },
  cover: { maxBytes: 2 * 1024 * 1024, label: 'Cover photo' },
  signature: { maxBytes: 200 * 1024, label: 'Signature' },
}

// Magic bytes, so a declared type can't smuggle other content (e.g. SVG/HTML).
const SIGNATURES = {
  'image/png': bytes => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/webp': bytes => bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP',
}

// Returns { contentType, data } (data = base64) or an error string.
export function parseImageDataUrl(kind, dataUrl) {
  const spec = ASSET_KINDS[kind]
  if (!spec) return 'Unknown asset'
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(String(dataUrl || ''))
  if (!match) return 'Upload a PNG, JPEG or WebP image'
  const [, contentType, data] = match
  if (kind === 'signature' && contentType !== 'image/png') return 'Signature must be a PNG'
  const bytes = Buffer.from(data, 'base64')
  if (bytes.length > spec.maxBytes) return `${spec.label} must be under ${Math.round(spec.maxBytes / 1024)} KB`
  if (!SIGNATURES[contentType](bytes)) return 'File content does not match its image type'
  return { contentType, data }
}

export const assetUrl = (userId, kind, updatedAt) => `/api/brand/${userId}/${kind}?v=${encodeURIComponent(new Date(updatedAt).getTime() || 0)}`

const FALLBACK_FILES = { cover: ['contract-cover.jpg', 'contract-cover.webp', 'contract-cover.png'], logo: ['logo.png', 'logo.webp', 'logo.jpg'] }
function fallback(envValue, kind) {
  const configured = safeImageUrl(envValue)
  if (configured) return configured
  const found = FALLBACK_FILES[kind].find(name => fs.existsSync(path.join(process.cwd(), 'public', 'brand', name)))
  return found ? `/brand/${found}` : ''
}

// Branding for a studio's public pages: uploaded assets first, then
// CONTRACT_COVER_URL / STUDIO_LOGO_URL, then files in public/brand/.
export async function loadBranding(db, userId) {
  const { data, error } = await db.from('studio_assets').select('kind, updated_at').eq('user_id', userId)
  if (error) console.error('[branding]', error.message)
  const rows = Object.fromEntries((data || []).map(row => [row.kind, row]))
  // Only the (small) signature is inlined; logo and cover load by URL.
  const { data: signature } = rows.signature
    ? await db.from('studio_assets').select('content_type, data').eq('user_id', userId).eq('kind', 'signature').single()
    : { data: null }
  return {
    logoUrl: rows.logo ? assetUrl(userId, 'logo', rows.logo.updated_at) : fallback(process.env.STUDIO_LOGO_URL, 'logo'),
    coverUrl: rows.cover ? assetUrl(userId, 'cover', rows.cover.updated_at) : fallback(process.env.CONTRACT_COVER_URL, 'cover'),
    signatureImage: signature ? `data:${signature.content_type};base64,${signature.data}` : '',
  }
}
