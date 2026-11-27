import { requireUser } from '../../lib/api-auth'
import { appUrl } from '../../lib/studioConfig'
import { chatUrl } from '../../lib/conversations'
import { createContractToken, createInvoiceToken, createQuestionnaireToken, createQuoteToken } from '../../lib/signingTokens'

// Studio only: the client's secure link for any document — the same pages the
// emails open — so it can be sent by text or WhatsApp when email doesn't
// arrive. Also reports whether the client has finished (paid / accepted /
// signed / answered) so the app can show it live, plus the fields to update.
const KINDS = {
  invoice: {
    table: 'invoices', select: 'id, amount, paid, status, paid_at, payment_method, line_items',
    path: id => `/invoice/${createInvoiceToken(id)}`,
    state: r => ({ done: r.status === 'paid', partial: r.status === 'partial', amount: Number(r.amount) || 0, paid: Number(r.paid) || 0,
      patch: { paid: Number(r.paid) || 0, status: r.status || 'unpaid', paidAt: r.paid_at || null, paymentMethod: r.payment_method || null, payments: Array.isArray(r.line_items) ? [] : r.line_items?.payments || [] } }),
  },
  quote: {
    table: 'quotes', select: 'id, status, line_items',
    path: id => `/quote/${createQuoteToken(id)}`,
    state: r => ({ done: r.status === 'accepted', patch: { status: r.status || 'draft', invoiceId: r.line_items?.invoiceId || null, acceptedAt: r.line_items?.acceptedAt || null } }),
  },
  contract: {
    table: 'contracts', select: 'id, status, signed_by, signed_at',
    path: id => `/sign/${createContractToken(id)}`,
    state: r => ({ done: r.status === 'signed', patch: { status: r.status || 'pending', signedBy: r.signed_by || null, signedAt: r.signed_at || null } }),
  },
  questionnaire: {
    table: 'questionnaires', select: 'id, status, answers',
    path: id => `/questionnaire/${createQuestionnaireToken(id)}`,
    state: r => ({ done: r.status === 'completed', patch: { status: r.status || 'sent', answers: r.answers || {} } }),
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const kind = String(req.body?.kind || '')
  const id = String(req.body?.id || '')
  res.setHeader('Cache-Control', 'no-store')

  if (kind === 'chat') {
    const { data: client } = await auth.db.from('clients').select('id').eq('id', id).eq('user_id', auth.user.id).maybeSingle()
    if (!client) return res.status(404).json({ error: 'Save the client first' })
    const url = chatUrl(client.id)
    if (!url) return res.status(503).json({ error: 'Set CONTRACT_SIGNING_SECRET on the server to create links' })
    return res.status(200).json({ url, done: false })
  }

  const spec = KINDS[kind]
  if (!spec || !id) return res.status(400).json({ error: 'Unknown link type' })
  const { data: row, error } = await auth.db.from(spec.table).select(spec.select).eq('id', id).eq('user_id', auth.user.id).maybeSingle()
  if (error) return res.status(500).json({ error: 'Could not load it' })
  // Freshly created documents take a moment to save; the app retries on 404.
  if (!row) return res.status(404).json({ error: `Still saving the ${kind} — try again in a moment` })
  let url
  try { url = appUrl(spec.path(row.id)) } catch { url = null }
  if (!url) return res.status(503).json({ error: 'Set CONTRACT_SIGNING_SECRET and NEXT_PUBLIC_APP_URL on the server to create links' })
  return res.status(200).json({ url, ...spec.state(row) })
}
