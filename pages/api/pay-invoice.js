import { createServiceClient } from '../../lib/pibase'
import { verifyInvoiceToken } from '../../lib/signingTokens'
import { stripeConfigFor } from '../../lib/integrations'
import { checkoutSessionForInvoice } from '../../lib/payments'
import { rateLimit } from '../../lib/rateLimit'

// Public: exchanges a signed invoice payment link for a Stripe Checkout URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!rateLimit(req, res, { key: 'pay-invoice', limit: 20, windowMs: 10 * 60 * 1000 })) return

  const parsed = verifyInvoiceToken(req.body?.token)
  if (!parsed) return res.status(400).json({ error: 'Invalid payment link' })
  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Payments are temporarily unavailable' })

  const { data: invoice } = await db.from('invoices')
    .select('id, user_id, client_id, number, amount, paid, status, payment_intent_id, stripe_checkout_session_id')
    .eq('id', parsed.invoiceId).single()
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  const config = await stripeConfigFor(db, invoice.user_id)
  if (!config) return res.status(503).json({ error: 'Online payment is not available for this invoice' })

  const [{ data: client }, { data: profile }] = await Promise.all([
    invoice.client_id ? db.from('clients').select('email').eq('id', invoice.client_id).eq('user_id', invoice.user_id).single() : Promise.resolve({ data: null }),
    db.from('profiles').select('business_name').eq('id', invoice.user_id).single(),
  ])

  try {
    const result = await checkoutSessionForInvoice({
      db, stripe: config.stripe, invoice, userId: invoice.user_id, token: req.body.token,
      clientEmail: client?.email, businessName: profile?.business_name,
    })
    if (result.paid) return res.status(409).json({ error: 'This invoice is already paid' })
    if (result.processing) return res.status(409).json({ error: 'A payment for this invoice is already being processed' })
    return res.status(200).json({ url: result.url })
  } catch (error) {
    console.error('[pay-invoice]', error.message)
    return res.status(502).json({ error: 'Unable to start checkout right now' })
  }
}
