import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { requireUser } from '../../lib/api-auth'
import { MEDIA_DIR, mediaPath } from '../../lib/media'

// Studio only: saves a photo (resized in the browser, sent as the raw image
// body) and returns its public URL, e.g. /api/media/<uuid>.jpg
export const config = { api: { bodyParser: false } }
const MAX = 4 * 1024 * 1024
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const readBody = req => new Promise((resolve, reject) => {
  const chunks = []; let size = 0
  req.on('data', chunk => { size += chunk.length; if (size > MAX) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy() } else chunks.push(chunk) })
  req.on('end', () => resolve(Buffer.concat(chunks)))
  req.on('error', reject)
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  // requireUser reads only the Authorization header, so the raw body is untouched.
  const auth = await requireUser(req, res)
  if (!auth) return
  let bytes
  try { bytes = await readBody(req) } catch (error) { return res.status(error.status || 400).json({ error: error.status === 413 ? 'That photo is too large (max 4 MB)' : 'Upload failed' }) }
  // Trust the file's own signature, not the browser's label.
  const sig = bytes.subarray(0, 12)
  const real = sig[0] === 0xff && sig[1] === 0xd8 ? 'image/jpeg'
    : sig.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png'
    : sig.subarray(0, 4).toString() === 'RIFF' && sig.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null
  if (!real) return res.status(400).json({ error: 'That file is not a valid photo' })
  const name = `${randomUUID()}.${EXT[real]}`
  try {
    await mkdir(MEDIA_DIR, { recursive: true })
    await writeFile(mediaPath(name), bytes, { flag: 'wx' })
  } catch (error) {
    console.error('[media-upload]', error.message)
    return res.status(500).json({ error: 'Could not save the photo on the server' })
  }
  return res.status(201).json({ url: `/api/media/${name}` })
}
