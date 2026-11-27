import { requireUser } from '../../lib/api-auth'
import { appUrl } from '../../lib/studioConfig'
import { createProposalToken } from '../../lib/signingTokens'

// Studio only: a proposal's client link, plus its live status (views,
// accepted) for the share window.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  res.setHeader('Cache-Control', 'no-store')
  const id = String(req.body?.id || '')
  const { data: row } = await auth.db.from('proposals').select('id, status, view_count, viewed_at, accepted_at, acceptance, client_id, declined_at, decline_reason').eq('id', id).eq('user_id', auth.user.id).maybeSingle()
  if (!row) return res.status(404).json({ error: 'Still saving the proposal — try again in a moment' })
  let url = null
  try { url = appUrl(`/proposal/${createProposalToken(row.id)}`) } catch {}
  if (!url) return res.status(503).json({ error: 'Set CONTRACT_SIGNING_SECRET on the server to create proposal links' })
  return res.status(200).json({ url, status: row.status, viewCount: row.view_count || 0, viewedAt: row.viewed_at, acceptedAt: row.accepted_at, acceptance: row.acceptance || {}, clientId: row.client_id, declinedAt: row.declined_at, declineReason: row.decline_reason || '' })
}
