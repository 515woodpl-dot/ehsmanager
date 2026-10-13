import { requireUser } from '../../lib/api-auth'
import { chatUrl } from '../../lib/conversations'

// Returns a client's private chat link so the studio can share it.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const clientId = String(req.body?.clientId || '')
  const { data: client } = await auth.db.from('clients').select('id').eq('id', clientId).eq('user_id', auth.user.id).maybeSingle()
  if (!client) return res.status(404).json({ error: 'Client not found' })
  const url = chatUrl(client.id)
  if (!url) return res.status(503).json({ error: 'Set CONTRACT_SIGNING_SECRET on the server to create chat links' })
  return res.status(200).json({ url })
}
