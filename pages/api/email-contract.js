import { emailWrap, sendStudioEmail, signOffHtml } from '../../lib/email'
import { requireUser } from '../../lib/api-auth'
import { createContractToken } from '../../lib/signingTokens'
import { messageHtml, cleanSubject } from '../../lib/documentEmail'
import { contractDate, contractLanguage } from '../../lib/contractTemplate'

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
    .select('id, client_id, client_name, type, body, sent, status, fields')
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
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.515studio.net'}/sign/${createContractToken(contract.id)}`
    : null
  const preview = escapeHtml(contract.body || '').substring(0, 2000)

  const es = contractLanguage(row) === 'es'
  const L = es
    ? { fallback: 'Contrato de servicios', hi: n => `Hola ${n || ''},`.replace(' ,', ','), intro: 'Por favor revise su contrato abajo. Puede firmarlo de forma segura con el botón de este correo.', contract: 'Contrato', sent: 'Enviado', status: 'Estado', awaiting: 'Pendiente de firma', button: 'Revisar y firmar el contrato', questions: 'Si tiene preguntas sobre las condiciones, escríbanos antes de firmar.', subject: (t, b) => `Su ${t} — ${b}` }
    : { fallback: 'Services Agreement', hi: n => `Hi ${n || 'there'},`, intro: 'Please review your contract below. You can sign it securely using the button in this email.', contract: 'Contract', sent: 'Sent', status: 'Status', awaiting: 'Awaiting signature', button: 'Review and sign contract', questions: 'If you have any questions about the contract terms, please reach out before signing.', subject: (t, b) => `Your ${t} — ${b}` }
  const title = contract.type || L.fallback

  const html = emailWrap(`
    <h1>${escapeHtml(title)}</h1>
    ${messageHtml(req.body?.message) || `<p>${escapeHtml(L.hi(clientName))}</p>
    <p>${L.intro}</p>`}

    <div class="box">
      <div class="box-row"><span class="label">${L.contract}</span><span class="value">${escapeHtml(title)}</span></div>
      <div class="box-row"><span class="label">${L.sent}</span><span class="value">${escapeHtml(contract.sent || contractDate(es ? 'es' : 'en'))}</span></div>
      <div class="box-row"><span class="label">${L.status}</span><span class="value">${L.awaiting}</span></div>
    </div>

    ${signUrl ? `<a href="${signUrl}" class="btn">${L.button}</a>` : ''}

    ${contract.body ? `<div class="box" style="font-size:13px;line-height:1.8;font-family:Arial,sans-serif;color:#444;white-space:pre-wrap;max-height:400px;overflow:auto;">${preview}${contract.body.length > 2000 ? '...' : ''}</div>` : ''}

    <p>${L.questions}</p>
    ${signOffHtml(auth.config, es ? 'es' : 'en')}
  `, auth.config)

  const result = await sendStudioEmail(auth.config, {
    to: clientEmail,
    clientId: row.client_id,
    subject: cleanSubject(req.body?.subject) || L.subject(title, bizName),
    html,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  return res.status(200).json({ id: result.id })
}
