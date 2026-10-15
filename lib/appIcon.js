/**
 * lib/appIcon.js — home-screen app icons made from the studio's logo
 * (server only). Without a logo, the built-in "EH" icons in /public/icons
 * are used.
 */
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

// name → size, and how much of the square the logo may fill. Maskable
// icons get cropped to a circle/squircle by Android, so their logo stays
// inside the central safe zone.
export const ICONS = {
  'icon-192.png': { size: 192, fill: 0.74, fallback: 'icon-192.png' },
  'icon-512.png': { size: 512, fill: 0.74, fallback: 'icon-512.png' },
  'icon-maskable-512.png': { size: 512, fill: 0.58, fallback: 'icon-maskable-512.png' },
  'apple-touch-icon.png': { size: 180, fill: 0.74, fallback: 'apple-touch-icon.png' },
  'favicon-32.png': { size: 32, fill: 0.9, fallback: 'favicon-32.png' },
}

const LOGO_RE = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/
export const DEFAULT_ICON_BACKGROUND = '#ffffff'
export const cleanColor = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : DEFAULT_ICON_BACKGROUND

export const hasLogo = branding => LOGO_RE.test(branding?.logo || '')

// Changes whenever the logo or background changes, to bust caches.
export function iconVersion(branding) {
  if (!hasLogo(branding)) return 'default'
  return crypto.createHash('sha1').update(branding.logo).update(cleanColor(branding.iconBackground)).digest('hex').slice(0, 10)
}

export async function renderIcon(name, branding) {
  const spec = ICONS[name]
  if (!spec) return null
  if (!hasLogo(branding)) return fs.readFile(path.join(process.cwd(), 'public', 'icons', spec.fallback))

  const logo = Buffer.from(LOGO_RE.exec(branding.logo)[1], 'base64')
  const box = Math.round(spec.size * spec.fill)
  // Trim plain margins around the logo so it fills the icon nicely, then fit it.
  const trimmed = await sharp(logo).trim({ threshold: 10 }).toBuffer().catch(() => logo)
  const fitted = await sharp(trimmed).resize(box, box, { fit: 'inside', withoutEnlargement: false }).png().toBuffer()
  const { width, height } = await sharp(fitted).metadata()
  return sharp({ create: { width: spec.size, height: spec.size, channels: 4, background: cleanColor(branding.iconBackground) } })
    .composite([{ input: fitted, left: Math.round((spec.size - width) / 2), top: Math.round((spec.size - height) / 2) }])
    // Apple touch icons must be opaque.
    .flatten({ background: cleanColor(branding.iconBackground) })
    .png()
    .toBuffer()
}
