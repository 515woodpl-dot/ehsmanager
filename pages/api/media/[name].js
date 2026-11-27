import { readFile } from 'fs/promises'
import { MEDIA_NAME, MEDIA_TYPES, mediaPath } from '../../../lib/media'

// Public: serves an uploaded photo. Names are random and never reused, so
// browsers and CDNs may cache them forever.
export default async function handler(req, res) {
  const name = String(req.query.name || '')
  const match = MEDIA_NAME.exec(name)
  if (!match) return res.status(404).end()
  try {
    const bytes = await readFile(mediaPath(name))
    res.setHeader('Content-Type', MEDIA_TYPES[match[1]])
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.status(200).send(bytes)
  } catch {
    return res.status(404).end()
  }
}
