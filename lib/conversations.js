// Server helpers for client conversations (the Inbox `messages` table).
import { createChatToken } from './signingTokens'
import { appUrl } from './studioConfig'

export function chatUrl(clientId) {
  try { return appUrl(`/chat/${createChatToken(clientId)}`) } catch { return null }
}

export const messageTime = (date, timezone) => date.toLocaleString('en-US', { timeZone: timezone || 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Adds one entry to the client's conversation, creating it if needed.
// Entries carry stable ids, so a retried webhook never adds a duplicate.
export async function appendToConversation(db, { userId, client, entry, unread }) {
  const { data: rows } = await db.from('messages').select('id, thread')
    .eq('user_id', userId).eq('client_id', client.id)
    .order('updated_at', { ascending: false }).limit(1)
  const row = rows?.[0]
  const now = new Date().toISOString()
  if (row) {
    const thread = Array.isArray(row.thread) ? row.thread : []
    if (thread.some(item => item.id === entry.id)) return { duplicate: true, id: row.id }
    const { error } = await db.from('messages').update({ thread: [...thread, entry], unread, updated_at: now }).eq('id', row.id).eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { id: row.id }
  }
  const { data, error } = await db.from('messages').insert({ user_id: userId, client_id: client.id, from_name: client.name, thread: [entry], unread, updated_at: now }).select('id').single()
  if (error) throw new Error(error.message)
  return { id: data.id }
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
