import { requireUser } from '../../lib/api-auth'
import { sendPaymentReceipt } from '../../lib/paymentReceipt'

// Studio only: emails the client a receipt for a payment recorded by hand
// (cash, card in person, transfer). Sends for one payment on the invoice —
// the given paymentId, or the latest one. 404 while the invoice or payment
// is still saving, so the app retries.
const METHOD_LABELS = { Cash: 'Cash', 'Credit Card': 'Card', 'Bank transfer': 'Bank transfer / Zelle / Venmo / check', Stripe: 'Card (secure payment by Stripe)', 'Gift / Complimentary': 'Gift / complimentary' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const invoiceId = String(req.body?.invoiceId || '')
  const paymentId = req.body?.paymentId ? String(req.body.paymentId) : ''
  const { data: row, error } = await auth.db.from('invoices').select('id, amount, paid, status, line_items, client_id, client_name, number')
    .eq('id', invoiceId).eq('user_id', auth.user.id).maybeSingle()
  if (error) return res.status(500).json({ error: 'Could not load the invoice' })
  if (!row) return res.status(404).json({ error: 'The invoice is still saving' })
  const payments = (Array.isArray(row.line_items) ? [] : row.line_items?.payments || []).filter(p => !p.refund && Number(p.amount) > 0)
  const payment = paymentId ? payments.find(p => p.id === paymentId) : payments[payments.length - 1]
  if (!payment) return res.status(paymentId ? 404 : 400).json({ error: paymentId ? 'The payment is still saving' : 'This invoice has no payments yet' })
  const result = await sendPaymentReceipt(auth.db, {
    userId: auth.user.id, invoiceRow: row, amount: Number(payment.amount) || 0, paidTotal: Number(row.paid) || 0,
    method: METHOD_LABELS[payment.method] || payment.method || 'Payment', paidAt: payment.at || null,
  })
  if (result.skipped) return res.status(400).json({ error: 'This client has no email address — add one to their card first' })
  if (result.error) return res.status(502).json({ error: 'The receipt email could not be sent' })
  return res.status(200).json({ sent: true, to: result.to })
}
