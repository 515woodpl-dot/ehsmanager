// Server helpers for client conversations (the Inbox `messages` table).
import { createChatToken } from './signingTokens'
import { appUrl } from './studioConfig'

export function chatUrl(clientId, from) {
  try { return appUrl(`/chat/${createChatToken(clientId)}`, from) } catch { return null }
}

export const messageTime = (date, timezone) => date.toLocaleString('en-US', { timeZone: timezone || 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Adds one entry to the client's conversation, creating it if needed.
// Entries carry stable ids, so a retried webhook never adds a duplicate.
// Done in one database step (append_conversation_entry, migration 006) so
// messages sent at the same moment are all kept.
export async function appendToConversation(db, { userId, client, entry, unread }) {
  const { data, error } = await db.rpc('append_conversation_entry', {
    p_user_id: userId, p_client_id: client.id, p_from_name: client.name || '', p_entry: entry, p_unread: !!unread,
  })
  if (error) throw new Error(error.message)
  return { id: data?.id, ...(data?.duplicate ? { duplicate: true } : {}) }
}

// Keeps only the new part of an email reply: drops quoted history
// ("On … wrote:", "> …", forwarded headers) and trailing signature markers.
export function stripQuotedReply(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const out = []
  for (const line of lines) {
    const t = line.trim()
    if (/^On .+wrote:?$/i.test(t) || /^-{2,}\s*Original Message\s*-{2,}$/i.test(t) || /^From: .+/i.test(t) && out.length > 0 || /^_{5,}$/.test(t)) break
    if (t.startsWith('>')) continue
    if (t === '--' || t === '-- ') break
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
