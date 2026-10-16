import { requireUser } from '../../lib/api-auth'
import { emailWrap, sendStudioEmail, signOffHtml } from '../../lib/email'
import { appendToConversation, chatUrl, messageTime } from '../../lib/conversations'

const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const auth = await requireUser(req, res)
  if (!auth) return

  const message = String(req.body?.message || '').trim()
  const clientId = req.body?.clientId
  const clientName = String(req.body?.clientName || '').trim()
  if (!message || message.length > 5000) return res.status(400).json({ error: 'Enter a message under 5,000 characters' })

  let query = auth.db.from('clients').select('id,name,email').eq('user_id', auth.user.id)
  query = clientId ? query.eq('id', clientId) : query.eq('name', clientName)
  const { data: client } = await query.single()
  if (!client?.email) return res.status(400).json({ error: 'Choose a client with an email address' })

  const businessName = auth.config.branding.businessName
  const chat = chatUrl(client.id)
  const html = emailWrap(`
    <h1>A message from ${escapeHtml(businessName)}</h1>
    <p>Hi ${escapeHtml(client.name || 'there')},</p>
    <div class="box" style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#444;">${escapeHtml(message)}</div>
    ${chat ? `<p>Reply to this email, or message us anytime in your private chat:</p><p><a href="${escapeHtml(chat)}" class="btn" style="color:#ffffff;">Open our chat</a></p>` : '<p>You can reply directly to this email.</p>'}
    ${signOffHtml(auth.config)}
  `, auth.config)

  const result = await sendStudioEmail(auth.config, {
    to: client.email,
    clientId: client.id,
    subject: req.body?.subject || `Message from ${businessName}`,
    html,
  })
  if (result.error) return res.status(400).json({ error: result.error })

  // Save the reply on the server straight away so it shows in the client's
  // chat within seconds. The app adds the same entry (same id) locally,
  // and the sync merges by id, so it never appears twice.
  const now = new Date()
  const entryId = /^[\w-]{8,64}$/.test(req.body?.entryId || '') ? req.body.entryId : `out-${result.id || now.getTime()}`
  const entry = { id: entryId, from: 'You', text: message, time: messageTime(now, auth.config.timezone), at: now.toISOString(), out: true, via: 'email' }
  let conversationId = null
  try {
    conversationId = (await appendToConversation(auth.db, { userId: auth.user.id, client, entry, unread: false })).id
  } catch (error) {
    console.error('[email-message] could not save to conversation', error.message)
  }
  return res.status(200).json({ id: result.id, conversationId, entry, client: { id: client.id, name: client.name, email: client.email } })
}
