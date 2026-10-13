import { requireUser } from '../../lib/api-auth'
import { createQuoteToken } from '../../lib/signingTokens'
import { appUrl, escapeHtml, loadEmailClient, sendDocumentEmail } from '../../lib/documentEmail'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const auth = await requireUser(req, res)
  if (!auth) return

  const quoteId = req.body?.quote?.id
  if (!quoteId) return res.status(400).json({ error: 'Missing quote ID' })
  const { data: row } = await auth.db.from('quotes').select('id, client_id, amount, status, line_items, note')
    .eq('id', quoteId).eq('user_id', auth.user.id).single()
  if (!row) return res.status(404).json({ error: 'Quote not found' })
  const { client, error } = await loadEmailClient(auth, row.client_id)
  if (error) return res.status(400).json({ error })

  const number = row.line_items?.number || 'Quote'
  let buttonUrl = null
  try { buttonUrl = appUrl(`/quote/${createQuoteToken(row.id)}`) } catch { buttonUrl = null }
  const amount = '$' + Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })

  return sendDocumentEmail(res, auth, {
    client,
    subject: req.body?.subject,
    message: req.body?.message,
    heading: `Quote ${number}`,
    fallbackHtml: `<p>Hi ${escapeHtml(client.name || 'there')},</p><p>Your quote ${escapeHtml(number)} for ${amount} is ready to review.</p>`,
    buttonUrl,
    buttonLabel: 'View & accept quote',
    detailsHtml: `<div class="amount">${amount}</div>`,
  })
}
