import { requireUser } from '../../lib/api-auth'
import { pdfToMarkdown } from '../../lib/pdfToMarkdown'

// Studio only: upload a proposal PDF (raw body) → { title, markdown }.
export const config = { api: { bodyParser: false } }
const MAX = 8 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const chunks = []; let size = 0
  try {
    await new Promise((resolve, reject) => {
      req.on('data', c => { size += c.length; if (size > MAX) { reject(new Error('too large')); req.destroy() } else chunks.push(c) })
      req.on('end', resolve); req.on('error', reject)
    })
  } catch { return res.status(413).json({ error: 'That PDF is too large' }) }
  const buffer = Buffer.concat(chunks)
  if (buffer.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: 'That file is not a PDF' })
  try {
    return res.status(200).json(await pdfToMarkdown(buffer))
  } catch (error) {
    console.error('[proposal-import]', error.message)
    return res.status(422).json({ error: 'Could not read that PDF. Paste the text instead.' })
  }
}
