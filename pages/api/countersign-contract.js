import { requireUser } from '../../lib/api-auth'
import { cleanSignature, sendSignedCopy, signedDate } from '../../lib/contractCopy'

// The studio signs a contract — its own signature, or the client's when
// they sign in person. Saved on the server (so it can't race the client's
// own signing link), then the signed copy is emailed once both have signed.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return

  const { contractId, role = 'studio', resend = false } = req.body || {}
  if (!contractId) return res.status(400).json({ error: 'Missing contract' })
  const { data: row } = await auth.db.from('contracts').select('id, status, signed_by, signed_at, fields')
    .eq('id', contractId).eq('user_id', auth.user.id).single()
  if (!row) return res.status(404).json({ error: 'Contract not found' })
  let fields = row.fields || {}
  let status = row.status

  if (resend) {
    // Send the signed copy again on request.
    fields = { ...fields, copySentAt: null }
    await auth.db.from('contracts').update({ fields }).eq('id', row.id).eq('user_id', auth.user.id)
  } else {
    const signature = cleanSignature({ ...req.body, name: req.body?.name || (role === 'studio' ? auth.config.branding.ownerName : '') })
    if (signature.error) return res.status(400).json({ error: signature.error })
    const at = signedDate()
    if (role === 'client') {
      if (row.status !== 'pending') return res.status(409).json({ error: 'The client has already signed' })
      fields = { ...fields, signedVia: 'in_person', signatureMethod: signature.method, signatureData: signature.data }
      const { data: saved, error } = await auth.db.from('contracts').update({ status: 'signed', signed_by: signature.name, signed_at: at, fields })
        .eq('id', row.id).eq('user_id', auth.user.id).eq('status', 'pending').select('id')
      if (error) return res.status(500).json({ error: 'Unable to save the signature' })
      if (!saved?.length) return res.status(409).json({ error: 'The client has already signed' })
      status = 'signed'; row.signed_by = signature.name; row.signed_at = at
    } else {
      if (fields.studioSignature?.name) return res.status(409).json({ error: 'You have already signed this contract' })
      fields = { ...fields, studioSignature: { name: signature.name, method: signature.method, data: signature.data, at } }
      const { error } = await auth.db.from('contracts').update({ fields }).eq('id', row.id).eq('user_id', auth.user.id)
      if (error) return res.status(500).json({ error: 'Unable to save your signature' })
    }
  }

  const copy = await sendSignedCopy(auth.db, auth.config, row.id)
  const { data: fresh } = await auth.db.from('contracts').select('status, signed_by, signed_at, fields').eq('id', row.id).single()
  return res.status(200).json({
    contract: { status: fresh?.status || status, signedBy: fresh?.signed_by || row.signed_by || '', signedAt: fresh?.signed_at || row.signed_at || '', fields: fresh?.fields || fields },
    copy,
  })
}
