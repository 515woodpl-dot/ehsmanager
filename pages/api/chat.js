import crypto from 'crypto'
import { notifyStudio } from '../../lib/push'
import { createServiceClient } from '../../lib/pibase'
import { verifyChatToken } from '../../lib/signingTokens'
import { loadStudioConfig, appUrl } from '../../lib/studioConfig'
import { appendToConversation, messageTime } from '../../lib/conversations'
import { emailWrap, logoUrl, sendStudioEmail } from '../../lib/email'

const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

async function loadChat(db, clientId) {
  const { data: client } = await db.from('clients').select('id, user_id, name').eq('id', clientId).maybeSingle()
  if (!client) return null
  const { data: rows } = await db.from('messages').select('id, thread')
    .eq('user_id', client.user_id).eq('client_id', client.id).order('updated_at', { ascending: false }).limit(1)
  return { client, thread: Array.isArray(rows?.[0]?.thread) ? rows[0].thread : [] }
}

// Public client chat: GET the conversation, POST a new message.
// The signed link identifies the client; nothing else is exposed.
export default async function handler(req, res) {
  const token = req.method === 'GET' ? req.query.token : req.body?.token
  const parsed = verifyChatToken(token)
  if (!parsed) return res.status(404).json({ error: 'This chat link is not valid' })
  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Service is not configured' })
  const chat = await loadChat(db, parsed.chatClientId)
  if (!chat) return res.status(404).json({ error: 'Chat not found' })
  const config = await loadStudioConfig(db, chat.client.user_id)
  res.setHeader('Cache-Control', 'private, no-store')

  if (req.method === 'GET') {
    return res.status(200).json({
      businessName: config.branding.businessName,
      logo: logoUrl(config),
      clientName: (chat.client.name || '').split(/\s+/)[0],
      messages: chat.thread.slice(-200).map(m => ({ id: m.id, mine: !m.out, text: m.text, time: m.time || '' })),
    })
  }

  if (req.method === 'POST') {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    if (!text || text.length > 2000) return res.status(400).json({ error: 'Write a message under 2,000 characters' })
    const now = new Date()
    const entry = { id: `chat-${crypto.randomUUID()}`, from: chat.client.name, text, time: messageTime(now, config.timezone), at: now.toISOString(), out: false, via: 'chat' }
    try {
      await appendToConversation(db, { userId: chat.client.user_id, client: chat.client, entry, unread: true })
    } catch (error) {
      console.error('[chat]', error)
      return res.status(500).json({ error: 'Your message could not be sent. Please try again.' })
    }

    // Let the studio know by email too — at most once per 10 minutes of
    // back-and-forth, so a burst of chat messages doesn't flood the inbox.
    const last = [...chat.thread].reverse().find(m => !m.out && m.via === 'chat')
    const recent = last?.at && now - new Date(last.at) < 10 * 60 * 1000
    if (!recent && config.branding.studioEmail) {
      const html = emailWrap(`
        <h1>New message from ${escapeHtml(chat.client.name)}</h1>
        <div class="box" style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#444;">${escapeHtml(text)}</div>
        <a href="${escapeHtml(appUrl('/?view=inbox'))}" class="btn" style="color:#ffffff;">Reply in Studio Manager</a>
      `, config)
      const result = await sendStudioEmail(config, { to: config.branding.studioEmail, subject: `New chat message from ${chat.client.name}`, html, replyToStudio: false })
      if (result.error) console.error('[chat] notify failed', result.error)
    }
    await notifyStudio(db, chat.client.user_id, { type: 'messages', title: `💬 ${chat.client.name}`, body: text, url: '/?view=inbox', tag: `messages-${chat.client.id}` })
    return res.status(200).json({ message: { id: entry.id, mine: true, text: entry.text, time: entry.time } })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
