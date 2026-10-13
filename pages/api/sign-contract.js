import { createServiceClient } from '../../lib/pibase'
import { verifyContractToken } from '../../lib/signingTokens'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const db = createServiceClient()
  if (!db) return res.status(500).json({ error: 'Database not configured' })

  const { token, signerName, signerEmail } = req.body || {}
  const parsed = verifyContractToken(token)
  if (!parsed) return res.status(400).json({ error: 'Invalid signing link' })
  if (!String(signerName || '').trim()) return res.status(400).json({ error: 'Signer name is required' })

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
      signed_by: String(signerName).trim(),
      signed_at: signedAt,
      fields: { ...(current?.fields || {}), signerEmail: signerEmail || null, signedVia: 'public_link' },
    })
    .eq('id', parsed.contractId)
    .eq('status', 'pending')
    .select('id')

  if (error) return res.status(500).json({ error: 'Unable to sign contract' })
  if (!signed?.length) return res.status(409).json({ error: 'Contract has already been signed' })
  return res.status(200).json({ ok: true, signedAt })
}
