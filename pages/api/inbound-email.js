import { Resend } from 'resend'
import { createServiceClient } from '../../lib/pibase'
import { clientIdFromReplyAddress, defaultStudioId, getResend, loadStudioConfig } from '../../lib/studioConfig'
import { appendToConversation, messageTime, stripQuotedReply } from '../../lib/conversations'

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const emailOf = value => (/<([^>]+)>/.exec(String(value || ''))?.[1] || String(value || '')).trim().toLowerCase()
const htmlToText = html => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

// Resend "email.received" webhook: a client replied to one of our emails.
// The reply is added to that client's conversation in the Inbox.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const db = createServiceClient()
  const studioId = defaultStudioId(req)
  if (!db || !studioId) return res.status(503).json({ error: 'Inbound email is not configured' })
  const config = await loadStudioConfig(db, studioId)
  const secret = config.secrets.resendWebhookSecret
  if (!secret) return res.status(503).json({ error: 'Add the Resend webhook signing secret in Settings' })

  const raw = await getRawBody(req)
  let event
  try {
    event = new Resend(config.secrets.resendApiKey || 're_unused').webhooks.verify({
      payload: raw,
      headers: {
        id: req.headers['svix-id'] || req.headers['webhook-id'],
        timestamp: req.headers['svix-timestamp'] || req.headers['webhook-timestamp'],
        signature: req.headers['svix-signature'] || req.headers['webhook-signature'],
      },
      webhookSecret: secret,
    })
  } catch {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }
  if (event?.type !== 'email.received') return res.status(200).json({ ignored: true })

  const data = event.data || {}
  // Find the client: the reply+… address first, then the sender's email.
  const recipients = [...(data.to || []), ...(data.cc || [])]
  let clientId = recipients.map(clientIdFromReplyAddress).find(Boolean)
  let client = null
  if (clientId) {
    client = (await db.from('clients').select('id, name, email').eq('id', clientId).eq('user_id', studioId).maybeSingle()).data
  }
  if (!client) {
    const sender = emailOf(data.from)
    const { data: matches } = await db.from('clients').select('id, name, email').eq('user_id', studioId).ilike('email', sender).limit(1)
    client = matches?.[0] || null
  }
  if (!client) return res.status(200).json({ ignored: true, reason: 'No matching client' })

  // The webhook only carries metadata; fetch the body from Resend.
  let text = ''
  const resend = getResend(config)
  if (resend && data.email_id) {
    const { data: full } = await resend.emails.receiving.get(data.email_id)
    text = stripQuotedReply(full?.text || htmlToText(full?.html))
  }
  if (!text) text = data.subject ? `(Email: ${data.subject})` : '(Empty email)'

  try {
    await appendToConversation(db, {
      userId: studioId, client, unread: true,
      entry: { id: `email-${data.email_id || Date.now()}`, from: client.name, text: text.slice(0, 10000), time: messageTime(new Date(event.created_at || Date.now()), config.timezone), at: new Date().toISOString(), out: false, via: 'email' },
    })
  } catch (error) {
    console.error('[inbound-email]', error)
    return res.status(500).json({ error: 'Could not save the reply' })
  }
  return res.status(200).json({ received: true })
}
