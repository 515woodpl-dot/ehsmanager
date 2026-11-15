import { createServiceClient } from '../../lib/pibase'
import { notifyStudio } from '../../lib/push'
import { verifyContractToken } from '../../lib/signingTokens'
import { loadStudioConfig } from '../../lib/studioConfig'
import { sendSignedCopy } from '../../lib/contractCopy'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const db = createServiceClient()
  if (!db) return res.status(500).json({ error: 'Database not configured' })

  const { token, signerName, signerEmail, signatureData, signatureMethod } = req.body || {}
  const parsed = verifyContractToken(token)
  if (!parsed) return res.status(400).json({ error: 'Invalid signing link' })
  const name = typeof signerName === 'string' ? signerName.trim() : ''
  if (!name) return res.status(400).json({ error: 'Signer name is required' })
  if (name.length > 120) return res.status(400).json({ error: 'Signer name must be 120 characters or fewer' })
  const email = typeof signerEmail === 'string' ? signerEmail.trim().slice(0, 254) : ''
  if (signerEmail != null && typeof signerEmail !== 'string') return res.status(400).json({ error: 'Enter your email address as text' })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' })
  if (signatureMethod === 'draw' && (!String(signatureData || '').startsWith('data:image/png;base64,') || String(signatureData).length > 350000)) return res.status(400).json({ error: 'A valid drawn signature is required' })

  const { data: current, error: lookupError } = await db
    .from('contracts')
    .select('fields, status, user_id, client_name, type')
    .eq('id', parsed.contractId)
    .single()
  if (lookupError && lookupError.code !== 'PGRST116') return res.status(503).json({ error: 'Signing is busy right now. Please try again in a moment.' })
  if (!current) return res.status(404).json({ error: 'Contract not found' })
  if (current.status !== 'pending') return res.status(409).json({ error: 'Contract has already been signed' })

  const signedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  // Merged into the contract's fields in the database, so a studio signature
  // saved at the same moment is kept (sign_contract, migration 006).
  const { data: fields, error } = await db.rpc('sign_contract', {
    p_contract_id: parsed.contractId, p_signed_by: name, p_signed_at: signedAt,
    p_fields: { signerEmail: email || null, signedVia: 'public_link', signatureMethod: signatureMethod === 'draw' ? 'draw' : 'type', signatureData: signatureMethod === 'draw' ? signatureData : null },
  })
  if (error) return res.status(503).json({ error: 'Signing is busy right now. Please try again in a moment.' })
  if (!fields) return res.status(409).json({ error: 'Contract has already been signed' })
  const studioSigned = !!fields.studioSignature?.name
  await notifyStudio(db, current.user_id, { type: 'documents', title: `✍️ ${current.client_name || name} signed`, body: `${current.type || 'Contract'}${studioSigned ? ' · fully signed, copy emailed' : ' · add your signature to complete it'}`, url: '/?view=contracts', tag: `contract-${parsed.contractId}` })
  // If the studio already signed, the client gets their signed copy now.
  const copy = studioSigned ? await sendSignedCopy(db, await loadStudioConfig(db, current.user_id), parsed.contractId) : null
  return res.status(200).json({ ok: true, signedAt, copySent: !!copy?.sent, studioSigned })
}
