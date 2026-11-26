import { requireUser } from '../../lib/api-auth'

// Removes one message from a conversation thread on the server first, so the
// app's sync (which merges in server-side replies) can't bring it back.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const conversationId = String(req.body?.conversationId || '')
  const messageId = String(req.body?.messageId || '')
  if (!conversationId || !messageId) return res.status(400).json({ error: 'Missing conversation or message' })
  const { data: row, error } = await auth.db.from('messages').select('id, thread').eq('id', conversationId).eq('user_id', auth.user.id).maybeSingle()
  if (error) return res.status(500).json({ error: 'Could not load the conversation' })
  if (!row) return res.status(200).json({ ok: true }) // not saved yet — nothing on the server to remove
  const thread = (Array.isArray(row.thread) ? row.thread : []).filter(entry => String(entry.id) !== messageId)
  const { error: updateError } = await auth.db.from('messages').update({ thread, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', auth.user.id)
  if (updateError) return res.status(500).json({ error: 'Could not delete the message' })
  return res.status(200).json({ ok: true })
}
