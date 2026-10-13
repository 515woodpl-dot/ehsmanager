import { createServiceClient } from '../../lib/pibase'
import { verifyContractToken } from '../../lib/signingTokens'
import { clientIp, rateLimit } from '../../lib/rateLimit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!rateLimit(req, res, { key: 'sign-contract', limit: 10, windowMs: 10 * 60 * 1000 })) return

  const db = createServiceClient()
  if (!db) return res.status(500).json({ error: 'Database not configured' })

  const { token, signerName, signerEmail, signatureImage } = req.body || {}
  const parsed = verifyContractToken(token)
  if (!parsed) return res.status(400).json({ error: 'Invalid signing link' })
  const name = String(signerName || '').trim().slice(0, 160)
  const email = String(signerEmail || '').trim().slice(0, 254)
  if (!name) return res.status(400).json({ error: 'Signer name is required' })
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email' })
  // Optional hand-drawn signature: a small PNG from the signing pad, nothing else.
  const image = typeof signatureImage === 'string' ? signatureImage : ''
  if (image && (image.length > 300000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(image))) return res.status(400).json({ error: 'Signature image is invalid' })

  const { data: current, error: lookupError } = await db
    .from('contracts')
    .select('fields, status')
    .eq('id', parsed.contractId)
    .single()
  if (lookupError || !current) return res.status(404).json({ error: 'Contract not found' })
  if (current.status !== 'pending') return res.status(409).json({ error: 'Contract has already been signed' })

  const signedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const { data: signed, error } = await db
    .from('contracts')
    .update({
      status: 'signed',
      signed_by: name,
      signed_at: signedAt,
      // Evidence trail for the electronic signature.
      fields: {
        ...(current?.fields || {}),
        signerEmail: email || null,
        signatureImage: image || null,
        signedVia: 'public_link',
        signedAtIso: new Date().toISOString(),
        signerIp: clientIp(req),
        signerUserAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      },
    })
    .eq('id', parsed.contractId)
    .eq('status', 'pending')
    .select('id')

  if (error) return res.status(500).json({ error: 'Unable to sign contract' })
  if (!signed?.length) return res.status(409).json({ error: 'Contract has already been signed' })
  return res.status(200).json({ ok: true, signedAt })
}
