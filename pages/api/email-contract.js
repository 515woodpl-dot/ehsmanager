import { emailWrap, sendStudioEmail, signOffHtml } from '../../lib/email'
import { requireUser } from '../../lib/api-auth'
import { createContractToken } from '../../lib/signingTokens'
import { messageHtml, cleanSubject } from '../../lib/documentEmail'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireUser(req, res)
  if (!auth) return
  const bizName = auth.config.branding.businessName
  const ownerName = (auth.config.branding.ownerName || '').split(' ')[0] || bizName

  const contractId = req.body?.contract?.id
  if (!contractId) return res.status(400).json({ error: 'Missing contract ID' })
  const { data: row, error: lookupError } = await auth.db.from('contracts')
    .select('id, client_id, client_name, type, body, sent, status')
    .eq('id', contractId).eq('user_id', auth.user.id).single()
  if (lookupError || !row) return res.status(404).json({ error: 'Contract not found' })
  if (row.status !== 'pending') return res.status(409).json({ error: 'Contract is already signed' })
  if (!row.client_id) return res.status(400).json({ error: 'Contract has no linked client' })
  const { data: client } = await auth.db.from('clients').select('name, email')
    .eq('id', row.client_id).eq('user_id', auth.user.id).single()
  if (!client?.email) return res.status(400).json({ error: 'Client email is missing' })
  const contract = { id: row.id, type: row.type, body: row.body, sent: row.sent }
  const clientEmail = client.email
  const clientName = client.name
  const signUrl = contract.id
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.elliesheartstrings.com'}/sign/${createContractToken(contract.id)}`
    : null
  const preview = escapeHtml(contract.body || '').substring(0, 2000)

  const html = emailWrap(`
    <h1>${escapeHtml(contract.type || 'Photography Agreement')}</h1>
    ${messageHtml(req.body?.message) || `<p>Hi ${escapeHtml(clientName || 'there')},</p>
    <p>Please review your photography contract below. You can sign it securely using the button in this email.</p>`}

    <div class="box">
      <div class="box-row"><span class="label">Contract</span><span class="value">${escapeHtml(contract.type || 'Photography Agreement')}</span></div>
      <div class="box-row"><span class="label">Sent</span><span class="value">${escapeHtml(contract.sent || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}</span></div>
      <div class="box-row"><span class="label">Status</span><span class="value">Awaiting signature</span></div>
    </div>

    ${signUrl ? `<a href="${signUrl}" class="btn">Review and sign contract</a>` : ''}

    ${contract.body ? `<div class="box" style="font-size:13px;line-height:1.8;font-family:Arial,sans-serif;color:#444;white-space:pre-wrap;max-height:400px;overflow:auto;">${preview}${contract.body.length > 2000 ? '...' : ''}</div>` : ''}

    <p>If you have any questions about the contract terms, please reach out before signing.</p>
    ${signOffHtml(auth.config)}
  `, auth.config)

  const result = await sendStudioEmail(auth.config, {
    to: clientEmail,
    clientId: row.client_id,
    subject: cleanSubject(req.body?.subject) || `Your ${contract.type || 'Photography Agreement'} — ${bizName}`,
    html,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  return res.status(200).json({ id: result.id })
}
