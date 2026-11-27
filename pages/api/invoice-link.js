import { requireUser } from '../../lib/api-auth'
import { appUrl } from '../../lib/studioConfig'
import { createInvoiceToken } from '../../lib/signingTokens'

// Studio only: the client's secure invoice/payment page link (same page the
// invoice email links to), plus the invoice's live payment status so the
// app can show "paid" the moment Stripe confirms it.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const invoiceId = String(req.body?.invoiceId || '')
  const { data: row, error } = await auth.db.from('invoices').select('id, amount, paid, status, paid_at, payment_method, line_items')
    .eq('id', invoiceId).eq('user_id', auth.user.id).maybeSingle()
  if (error) return res.status(500).json({ error: 'Could not load the invoice' })
  if (!row) return res.status(404).json({ error: 'Save the invoice first, then copy its payment link' })
  let url
  try { url = appUrl(`/invoice/${createInvoiceToken(row.id)}`) } catch { url = null }
  if (!url) return res.status(503).json({ error: 'Set CONTRACT_SIGNING_SECRET on the server to create payment links' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    url,
    amount: Number(row.amount) || 0, paid: Number(row.paid) || 0, status: row.status || 'unpaid',
    paidAt: row.paid_at || null, paymentMethod: row.payment_method || null,
    payments: Array.isArray(row.line_items) ? [] : row.line_items?.payments || [],
  })
}
